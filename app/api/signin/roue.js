export const runtime = "edge";
export const fetchCache = "force-no-store";
import Joi from "joi";

import { userAgent } from "next/server";
import { MongoApiFindOne, MongoApiUpdateOne } from "@/helpers/mongoapi";
// import { sendMail } from '@/config/sendMail';
import { MongoApiInsertOne } from "@/helpers/mongoapi";
import { sendEmail } from "@/external/aws-sdk/clientSES";
import { trackError } from "@/helpers/trackerror";
import { sendEmailToUser } from "@/external/zeptomail";
// import logs from '@/helpers/logs';

const postSchema = Joi.object({
  mobile: Joi.string()
    .trim()
    .pattern(/^\+\d{1,3}\d{8,12}$/)
    .required(),
  country_iso: Joi.string().required(),
});

// const resource = "user";

export async function POST(request) {
  // const action = 'create';
  const validBody = postSchema.validate(await request.json());
  try {
    const userAgentInstance = userAgent(request);
    const headersInstance = new Headers(request.headers);
    const ip = headersInstance.get("X-Forwarded-For");
    const country = headersInstance.get("x-vercel-ip-country");
    const country_region = headersInstance.get("x-vercel-ip-country-region");
    const ip_city = headersInstance.get("x-vercel-ip-city");
    if (userAgentInstance.isBot) {
      await otpLogs(request, "Access Denied to Bots", validBody.value, 403);
      return new Response("Access Denied to Bots", { status: 403 });
    }

    if (validBody.error) {
      const errorMessages = validBody.error.details
        .map((d) => d.message)
        .join();
      await otpLogs(request, errorMessages, validBody.value, 400);
      return new Response(JSON.stringify(errorMessages), { status: 400 });
    }
    let { mobile, country_iso } = validBody.value;

    const isvalidMobile = await validateMobile(mobile, country_iso);
    if (!isvalidMobile) {
      await otpLogs(request, "Invalid mobile number", validBody.value, 403);
      return new Response("Invalid mobile number", { status: 403 });
    }

    const query = { mobile: mobile, cms_user: true, cms: { $ne: [] } };
    const projection = {
      _id: 1,
      first_name: 1,
      last_name: 1,
      email: 1,
      otp: 1,
    };
    const user = await MongoApiFindOne("users", query, projection);
    if (!user.data) {
      await otpLogs(
        request,
        `Couldn't find user with mobile number: ${mobile} or the user does not have a CMS role.`,
        validBody.value,
        404
      );
      return new Response(
        `Couldn't find user with mobile number: ${mobile} or the user does not have a CMS role.`,
        { status: 404 }
      );
    }

    const isValid = await validateUser(country_iso, user.data);

    if (isValid.valid) {
      const otp = generateRandomNumber();

      if (
        user.data.email.endsWith("travelxp.tv") ||
        user.data.email.endsWith("travelxp.com")
      ) {
        // Send the OTP to the said User.
        const message = emailTemplate(otp);
        // let result = await sendMail(user.data.email, 'CMS Login OTP', message);
        let result = await sendEmailToUser(
          [user.data.email],
          [],
          [],
          "CMS Login OTP",
          message
        );
        if (result.status !== 200)
          result = await sendEmail(
            [user.data.email],
            "CMS Login OTP",
            message,
            "no-reply@travelxp.com",
            [],
            [],
            true
          );
        // If the OTP sent is true, then enter the details of the OTP, IP address, expiry rules, etc. in the Users device for which the OTP is sent.
        if (result?.status === 200 || result?.success) {
          const date_otp_expires = new Date();
          date_otp_expires.setSeconds(
            date_otp_expires.getSeconds() + isValid.otp_expiry
          );

          const otpInsert = {
            _id: generateMongoId(),
            platform: "cms.travelxp",
            number: otp.toString(),
            created: { $date: new Date() },
            type: "email",
            city: ip_city,
            state: country_region,
            country: country,
            created_by_ip: ip,
            created_by_device: userAgentInstance.ua,
            valid_till: {
              $date: new Date(Date.now() + isValid.otp_expiry * 1000),
            },
            response: JSON.stringify(result.message),
            retry: isValid.next_event_wait,
            success: true,
            otpUsed: false,
          };

          const query = { mobile: mobile };
          const options = {
            $set: {
              modified_by: user.data._id,
              modified_on: { $date: new Date() },
            },
            $push: { otp: otpInsert },
          };

          const userOTPInserted = await MongoApiUpdateOne(
            "users",
            query,
            options
          );

          await MongoApiUpdateOne("users", query, {
            $pull: {
              otp: {
                created: {
                  $lte: { $date: new Date(Date.now() - 60 * 60 * 1000) },
                },
              },
            },
          }); //delete old otp

          if (userOTPInserted.status) {
            await otpLogs(
              request,
              {
                valid: true,
                email: user.data.email,
                otp: otp,
                name: user.data.first_name + "" + user.data.last_name,
                _id: user.data._id,
                retry_after: isValid.next_event_wait,
                otp_expires_after: isValid.otp_expiry,
                otp_expires_date: date_otp_expires,
              },
              validBody.value,
              200
            );
            return new Response(
              JSON.stringify({
                valid: true,
                message: `6 digit OTP sent to ${user.data.email}.`,
                retry_after: isValid.next_event_wait,
                otp_expires_after: isValid.otp_expiry,
                otp_expires_date: date_otp_expires,
              }),
              { status: 200 }
            );
          }
          await otpLogs(request, userOTPInserted, validBody.value, 403);
          return new Response(JSON.stringify(userOTPInserted), { status: 403 });
        }
        await otpLogs(request, "error while sending OTP", validBody.value, 403);
        return new Response(
          JSON.stringify({ message: "error while sending OTP" }),
          { status: 403 }
        );
      }
    }
    await otpLogs(request, isValid, validBody.value, 403);
    return new Response(JSON.stringify(isValid), { status: 403 });
  } catch (error) {
    await otpLogs(request, error.message, {}, 500);
    trackError(error, request);
    return new Response(JSON.stringify(error.message), { status: 500 });
  }
}

async function validateUser(country_iso, user) {
  const otpConfig = await MongoApiFindOne("config", {
    appname: "otp_throttling",
  });
  const next_event_wait = otpConfig.data.next_event_wait;
  const max_in_hour = otpConfig.data.max_in_hour;
  const max_in_day = otpConfig.data.max_in_day;
  const otp_expiry = otpConfig.data.otp_expiry;

  const isBlockedCountry = otpConfig.data.blocked_countries.find(
    (x) => x.iso_code === country_iso
  );

  if (isBlockedCountry || isBlockedCountry === "undefined") {
    console.log("returned from isBlockedCountry");
    return {
      valid: false,
      message: `This country is blocked : ${country_iso}`,
    };
  }

  if (user.otp?.find((x) => new Date(x.valid_till) >= new Date())) {
    return {
      valid: false,
      message:
        "You have a valid OTP sent already. Next Request can be sent only after some time.",
    };
  }

  if (user.blocked) {
    return { valid: false, message: "This user is blocked" };
  }

  let user_max_in_hour = 0;
  let user_max_in_day = 0;
  user.otp?.forEach((otp) => {
    if (new Date(otp.created) >= Date.now() - 60 * 60 * 1000) {
      user_max_in_hour++;
      user_max_in_day++;
    } else if (new Date(otp.created) >= Date.now() - 24 * 60 * 60 * 1000) {
      user_max_in_day++;
    }
  });
  if (user_max_in_hour >= max_in_hour)
    return {
      valid: false,
      message: "You have reached the maximum number of OTPs in an hour",
    };
  if (user_max_in_day >= max_in_day)
    return {
      valid: false,
      message: "You have reached the maximum number of OTPs in a day",
    };
  return {
    valid: true,
    message: "Send OTP to User",
    next_event_wait,
    otp_expiry: otp_expiry,
  };
}

async function otpLogs(request, response, body, status) {
  const userAgentInstance = userAgent(request);
  const headersInstance = new Headers(request.headers);
  const ip = headersInstance.get("X-Forwarded-For");
  const business_id = headersInstance.get("X-Travelxp-BusinessId");
  const country = headersInstance.get("x-vercel-ip-country");
  // const country_region = headersInstance.get('x-vercel-ip-country-region');
  // const ip_city = headersInstance.get('x-vercel-ip-city');
  const route = request.url;
  const method = request.method;
  // get business name
  const business = await MongoApiFindOne(
    "company",
    { _id: business_id },
    { projection: { name: 1 } }
  );
  if (typeof response === "string") {
    response = {
      otp: "",
      created: "",
      otp_valid_till: "",
      response: response,
      retry: 0,
      success: false,
    };
  } else {
    response = {
      otp: response?.otp,
      created: { $date: new Date() },
      otp_valid_till: { $date: response?.otp_expires_date },
      response: "otp sent successfully.",
      retry: 10,
      success: true,
    };
  }

  const log = {
    business_id: business_id,
    business_name: business.data?.name,
    type: "otp",
    category: "cms",
    route: route,
    method: method,
    status: status,
    request: {
      value: body.mobile,
      type: "email",
      country: country,
      created: { $date: new Date() },
      ip: ip,
      device: userAgentInstance.ua,
    },
    response: response,
    user_id: response?._id,
    user_name: response?.name,
    created_on: { $date: new Date() },
    expires_on: { $date: new Date() },
  };
  await MongoApiInsertOne("logs", log);
}

function generateRandomNumber() {
  var minm = 100000;
  var maxm = 999999;
  return Math.floor(Math.random() * (maxm - minm + 1)) + minm;
}

async function validateMobile(mobile, country_iso) {
  const country = await MongoApiFindOne("country", { iso_code: country_iso });
  if (!country.status) return false;
  const mobile_min_length = country.data.mobile_min_length;
  const mobile_max_length = country.data.mobile_max_length;
  const mobile_country_code = country.data.country_code;

  const user_mobile_length = mobile.slice(mobile_country_code.length).length;
  if (!mobile.slice(0, mobile_country_code.length) === mobile_country_code)
    return false;
  if (
    user_mobile_length >= mobile_min_length &&
    user_mobile_length <= mobile_max_length
  )
    return true;

  return false;
}
function generateMongoId(length = 24) {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}
function emailTemplate(otp) {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your login</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
    
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #ffffff;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
    
            .header {
                text-align: center;
                padding: 20px 0;
            }
    
            .header h1 {
                font-size: 24px;
                color: #333333;
            }
    
            .otp {
                text-align: center;
                margin-top: 30px;
            }
    
            .otp-code {
                font-size: 36px;
                font-weight: bold;
                color: #007bff;
            }
    
            .instructions {
                text-align: center;
                margin-top: 20px;
                font-size: 16px;
                color: #666666;
            }
    
            .footer {
                text-align: center;
                margin-top: 20px;
                color: #888888;
            }
    
            .footer p {
                font-size: 14px;
            }
        </style>
    </head>
    <body>
    <div class="container">
          <div class="header">
              <h1>CMS Login OTP</h1>
          </div>
          <div class="otp">
              <p>Your One-Time Password (OTP) is:</p>
              <p class="otp-code">${otp}</p>
          </div>
          <div class="instructions">
              <p>Please use this OTP to access your CMS account.</p>
          </div>
          <div class="footer">
              <p>&copy; 2023 Travelxp</p>
          </div>
      </div>
    </body>
    </html>`;
}
// {
//     next: undefined,
//     sourcePage: undefined,
// }
