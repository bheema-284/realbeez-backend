
import { NextResponse } from 'next/server';
import clientPromise from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import nodemailer from 'nodemailer';
import { ObjectId } from 'mongodb';
import { registerSchema, loginSchema, checkUserSchema, validateData } from '@/app/lib/validation';

// Generate random OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Get JWT secret
const getJWTSecretKey = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('JWT_SECRET is not set in environment variables');
        throw new Error('JWT_SECRET not set');
    }
    return new TextEncoder().encode(secret);
};

// Create JWT token
const createToken = async (payload, expiresIn = '7d') => {
    try {
        const secretKey = getJWTSecretKey();
        const jwt = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(expiresIn)
            .sign(secretKey);
        return jwt;
    } catch (error) {
        console.error('Error creating JWT token:', error);
        throw error;
    }
};

// Setup email transporter
const createTransporter = () => {
    try {
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASSWORD;

        console.log('Email configuration check:', {
            hasEmailUser: !!emailUser,
            hasEmailPass: !!emailPass,
            emailUserLength: emailUser?.length
        });

        if (!emailUser || !emailPass) {
            console.warn('Email credentials not set. Email OTP will be simulated.');
            return null;
        }

        // Check if email contains @gmail.com
        const isGmail = emailUser.includes('@gmail.com');

        const transporter = nodemailer.createTransport({
            service: isGmail ? 'gmail' : 'SMTP',
            host: isGmail ? 'smtp.gmail.com' : process.env.EMAIL_HOST,
            port: isGmail ? 587 : (process.env.EMAIL_PORT || 587),
            secure: false, // Use TLS
            auth: {
                user: emailUser,
                pass: emailPass,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        console.log('Email transporter created successfully');
        return transporter;
    } catch (error) {
        console.error('Error creating email transporter:', error);
        return null;
    }
};

const transporter = createTransporter();

// Send OTP via Email with better error handling
const sendOTPEmail = async (email, otp, isVerification = false) => {
    console.log('Attempting to send email to:', email);

    // If no transporter (email not configured), simulate sending for development
    if (!transporter) {
        console.log('📧 [SIMULATED] Email would be sent to:', email);
        console.log('📧 [SIMULATED] OTP:', otp);
        console.log('📧 [SIMULATED] Type:', isVerification ? 'Verification' : 'OTP');
        return {
            success: true,
            simulated: true,
            message: 'Email simulated (no email configuration)',
            otp: otp // Include OTP for testing
        };
    }

    if (!email || !email.includes('@')) {
        console.error('Invalid email address:', email);
        return { success: false, error: 'Invalid email address' };
    }

    try {
        let subject, html;

        if (isVerification) {
            subject = 'Welcome to Real Beez!';
            html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0;">Real Beez</h1>
                    </div>
                    <div style="padding: 40px; background: #f9f9f9; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                        <h2 style="color: #333; margin-top: 0;">Welcome to Real Beez!</h2>
                        <p style="color: #666; font-size: 16px; line-height: 1.6;">
                            Thank you for registering with Real Beez. Your email has been successfully verified.
                        </p>
                        <p style="color: #666; font-size: 14px; line-height: 1.6;">
                            You can now login and start using our services.
                        </p>
                    </div>
                </div>
            `;
        } else {
            subject = `Your OTP Code: ${otp} - Real Beez`;
            html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0;">Real Beez</h1>
                    </div>
                    <div style="padding: 40px; background: #f9f9f9; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                        <h2 style="color: #333; margin-top: 0;">Your OTP Code</h2>
                        <p style="color: #666; font-size: 16px; line-height: 1.6;">
                            Use this OTP to complete your verification:
                        </p>
                        <div style="background: white; padding: 25px; border-radius: 10px; text-align: center; border: 2px dashed #667eea; margin: 25px 0;">
                            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; margin: 15px 0; font-family: monospace;">
                                ${otp}
                            </div>
                            <div style="color: #888; font-size: 12px; margin-top: 10px;">
                                Valid for 10 minutes
                            </div>
                        </div>
                        <p style="color: #666; font-size: 14px; line-height: 1.6;">
                            This OTP is valid for <strong>10 minutes</strong>. Please do not share this code with anyone.
                        </p>
                        <div style="background: #fff8e1; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #ffc107;">
                            <p style="color: #856404; margin: 0; font-size: 13px;">
                                <strong>Note:</strong> If you didn't request this OTP, please ignore this email.
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }

        const mailOptions = {
            from: `"Real Beez" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: html,
            text: isVerification
                ? 'Welcome to Real Beez! Your email has been successfully verified.'
                : `Your Real Beez OTP is: ${otp}. Valid for 10 minutes.`,
        };

        console.log('Testing email connection...');
        await transporter.verify();
        console.log('Email connection verified');

        console.log('Sending email...');
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', {
            messageId: info.messageId,
            to: email,
            subject: subject
        });

        return {
            success: true,
            messageId: info.messageId,
            otp: otp // Include OTP for testing/debugging
        };
    } catch (error) {
        console.error('❌ Error sending email:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });

        // Provide more specific error messages
        let errorMessage = 'Failed to send email';
        let userMessage = 'Failed to send OTP email. Please try again.';

        if (error.code === 'EAUTH') {
            errorMessage = 'Email authentication failed. Check your credentials.';
            userMessage = 'Email service configuration error. Please contact support.';
        } else if (error.code === 'ECONNECTION') {
            errorMessage = 'Email connection failed. Check your network or email service.';
        } else if (error.responseCode === 550) {
            errorMessage = 'Email address rejected. Please check the email address.';
            userMessage = 'Email address is invalid or rejected. Please use a different email.';
        }

        return {
            success: false,
            error: userMessage,
            debug: error.message,
            otp: otp // Still return OTP so user can manually verify in dev
        };
    }
};

// Send SMS with better error handling and multiple fallbacks
const sendSMS = async (phone, otp) => {
    console.log('Attempting to send SMS to:', phone);

    if (!phone || phone.length !== 10) {
        console.error('Invalid phone number:', phone);
        return { success: false, error: 'Invalid phone number' };
    }

    const phoneNumber = phone.replace(/\D/g, '');
    if (phoneNumber.length !== 10) {
        return { success: false, error: 'Phone number must be 10 digits' };
    }

    const message = `Your Real Beez OTP is: ${otp}. Valid for 10 minutes.`;
    const fullPhoneNumber = `+91${phoneNumber}`;

    console.log(`📱 [SIMULATED] SMS would be sent to: ${fullPhoneNumber}`);
    console.log(`📱 [SIMULATED] OTP: ${otp}`);
    console.log(`📱 [SIMULATED] Message: ${message}`);

    // Note: Uncomment and configure one of the SMS providers below for production

    try {
        // OPTION 1: Twilio (Recommended)
        // if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        //     try {
        //         const twilioClient = require('twilio')(
        //             process.env.TWILIO_ACCOUNT_SID,
        //             process.env.TWILIO_AUTH_TOKEN
        //         );

        //         const message = await twilioClient.messages.create({
        //             body: `Your Real Beez OTP is: ${otp}. Valid for 10 minutes.`,
        //             from: process.env.TWILIO_PHONE_NUMBER,
        //             to: fullPhoneNumber
        //         });

        //         console.log(`✅ SMS sent via Twilio to ${phoneNumber}, SID: ${message.sid}`);
        //         return { success: true, provider: 'twilio', sid: message.sid };
        //     } catch (twilioError) {
        //         console.error('Twilio SMS failed:', twilioError.message);
        //         // Continue to next method
        //     }
        // }

        // OPTION 2: Fast2SMS
        // if (process.env.FAST2SMS_API_KEY) {
        //     try {
        //         const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        //             method: 'POST',
        //             headers: {
        //                 'authorization': process.env.FAST2SMS_API_KEY,
        //                 'Content-Type': 'application/json'
        //             },
        //             body: JSON.stringify({
        //                 route: 'q',
        //                 message: message,
        //                 language: 'english',
        //                 flash: 0,
        //                 numbers: phoneNumber
        //             })
        //         });

        //         const result = await response.json();
        //         if (result.return === true) {
        //             console.log(`✅ SMS sent via Fast2SMS to ${phoneNumber}`);
        //             return { success: true, provider: 'fast2sms' };
        //         } else {
        //             console.error('Fast2SMS error:', result.message || 'Unknown error');
        //         }
        //     } catch (fast2smsError) {
        //         console.error('Fast2SMS failed:', fast2smsError.message);
        //     }
        // }

        // OPTION 3: MSG91
        // if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) {
        //     try {
        //         const response = await fetch('https://api.msg91.com/api/v5/flow/', {
        //             method: 'POST',
        //             headers: {
        //                 'authkey': process.env.MSG91_AUTH_KEY,
        //                 'Content-Type': 'application/json'
        //             },
        //             body: JSON.stringify({
        //                 template_id: process.env.MSG91_TEMPLATE_ID,
        //                 sender: process.env.MSG91_SENDER_ID || 'REALBZ',
        //                 mobiles: fullPhoneNumber,
        //                 otp: otp
        //             })
        //         });

        //         const result = await response.json();
        //         if (result.type === 'success') {
        //             console.log(`✅ SMS sent via MSG91 to ${phoneNumber}`);
        //             return { success: true, provider: 'msg91' };
        //         } else {
        //             console.error('MSG91 error:', result.message);
        //         }
        //     } catch (msg91Error) {
        //         console.error('MSG91 failed:', msg91Error.message);
        //     }
        // }

        // OPTION 4: Email-to-SMS fallback
        if (transporter) {
            try {
                const carriers = [
                    { name: 'airtel', domain: 'airtelmail.com' },
                    { name: 'vodafone', domain: 'vodafone-sms.de' },
                    { name: 'idea', domain: 'ideacellular.net' },
                    { name: 'bsnl', domain: 'bsnl.in' },
                    { name: 'jio', domain: 'sms.jio.com' },
                    { name: 'jio', domain: 'jiomail.com' }
                ];

                for (const carrier of carriers) {
                    const email = `${phoneNumber}@${carrier.domain}`;
                    try {
                        await transporter.sendMail({
                            from: process.env.EMAIL_USER,
                            to: email,
                            subject: '',
                            text: message,
                            priority: 'high'
                        });
                        console.log(`✅ SMS sent via ${carrier.name} gateway to ${phoneNumber}`);
                        return { success: true, provider: `${carrier.name}-email` };
                    } catch (carrierError) {
                        console.log(`Failed ${carrier.name} gateway, trying next...`);
                        continue;
                    }
                }
            } catch (emailError) {
                console.error('Email-to-SMS fallback failed:', emailError.message);
            }
        }

        console.error('❌ All SMS methods failed for:', phoneNumber);
        return {
            success: false,
            error: 'Failed to send SMS via all available methods',
            suggestions: [
                'Check SMS API credentials',
                'Ensure sufficient SMS balance',
                'Verify phone number format'
            ]
        };

    } catch (error) {
        console.error('❌ Error in sendSMS:', error);
        return {
            success: false,
            error: 'SMS service error',
            debug: error.message
        };
    }
};

// Helper function to validate email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Helper function to validate phone
const isValidPhone = (phone) => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
};

// Helper function to clean and format phone number
const formatPhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `+91${cleaned}`;
    }
    return null;
};

// Store OTP in database
const storeOTP = async (otpCollection, data) => {
    const otpData = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        isVerified: false,
        attempts: 0
    };

    const result = await otpCollection.insertOne(otpData);
    return result.insertedId.toString();
};

// Get OTP from database
const getOTP = async (otpCollection, identifier, otp, type = 'email') => {
    const query = { identifier, otp, type, isVerified: false };

    const otpRecord = await otpCollection.findOne(query);

    if (!otpRecord) {
        return null;
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
        await otpCollection.updateOne(
            { _id: otpRecord._id },
            { $set: { isExpired: true, updatedAt: new Date() } }
        );
        return null;
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
        await otpCollection.updateOne(
            { _id: otpRecord._id },
            { $set: { isBlocked: true, updatedAt: new Date() } }
        );
        return null;
    }

    return otpRecord;
};

// Update OTP attempts
const updateOTPAttempts = async (otpCollection, otpId, increment = true) => {
    const update = increment
        ? { $inc: { attempts: 1 }, $set: { updatedAt: new Date() } }
        : { $set: { isVerified: true, verifiedAt: new Date(), updatedAt: new Date() } };

    await otpCollection.updateOne(
        { _id: new ObjectId(otpId) },
        update
    );
};

// Clean expired OTPs
const cleanExpiredOTPs = async (otpCollection) => {
    const result = await otpCollection.deleteMany({
        expiresAt: { $lt: new Date() },
        isVerified: false
    });
    if (result.deletedCount > 0) {
        console.log(`Cleaned ${result.deletedCount} expired OTPs`);
    }
};

// Main API handler
export async function POST(request) {
    console.log('=== API REQUEST RECEIVED ===');
    console.log('Time:', new Date().toISOString());
    console.log('Environment:', process.env.NODE_ENV);

    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
    };

    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, { headers, status: 200 });
    }

    try {
        // Parse request body
        let body;
        try {
            body = await request.json();
            console.log('Request Body:', JSON.stringify(body, null, 2));
        } catch (parseError) {
            console.error('Failed to parse JSON:', parseError);
            return NextResponse.json({
                success: false,
                error: 'Invalid JSON in request body'
            }, { status: 400, headers });
        }

        const { action } = body;

        if (!action) {
            return NextResponse.json({
                success: false,
                error: 'Action is required'
            }, { status: 400, headers });
        }

        console.log('Processing action:', action);

        // Test DB connection
        let client, db, usersCollection, otpCollection;
        try {
            console.log('Testing DB connection...');
            client = await clientPromise;
            db = client.db();
            await db.command({ ping: 1 });
            usersCollection = db.collection('users');
            otpCollection = db.collection('otp_logs');

            // Create indexes for OTP collection
            await otpCollection.createIndex({ identifier: 1, type: 1 });
            await otpCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 600 }); // Auto delete after 10 minutes

            console.log('✅ Database connected successfully');
        } catch (dbError) {
            console.error('Database connection error:', dbError);
            return NextResponse.json({
                success: false,
                error: 'Database connection failed',
                debug: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            }, { status: 500, headers });
        }

        // Clean expired OTPs on each request
        await cleanExpiredOTPs(otpCollection);

        switch (action) {
            // ========== CHECK USER ==========
            case 'check-user':
                console.log('Checking user...');

                const checkUserData = { ...body };
                delete checkUserData.action;

                const { error: checkError, value: checkData } = validateData(checkUserSchema, checkUserData);
                if (checkError) {
                    console.log('Validation error:', checkError);
                    return NextResponse.json({
                        success: false,
                        error: checkError[0].message
                    }, { status: 400, headers });
                }

                let query = {};
                if (checkData.email) {
                    query.email = checkData.email.toLowerCase();
                    console.log('Querying by email:', query.email);
                } else if (checkData.phone) {
                    const formattedPhone = formatPhoneNumber(checkData.phone);
                    if (!formattedPhone) {
                        return NextResponse.json({
                            success: false,
                            error: 'Invalid phone number'
                        }, { status: 400, headers });
                    }
                    query.phone = formattedPhone;
                    console.log('Querying by phone:', query.phone);
                } else {
                    return NextResponse.json({
                        success: false,
                        error: 'Either email or phone is required'
                    }, { status: 400, headers });
                }

                try {
                    const existingUser = await usersCollection.findOne(query);
                    console.log('User found:', !!existingUser);

                    return NextResponse.json({
                        success: true,
                        exists: !!existingUser,
                        user: existingUser ? {
                            id: existingUser._id.toString(),
                            email: existingUser.email,
                            phone: existingUser.phone,
                            name: existingUser.name,
                            isEmailVerified: existingUser.isEmailVerified
                        } : null
                    }, { headers });
                } catch (dbError) {
                    console.error('Database query error:', dbError);
                    return NextResponse.json({
                        success: false,
                        error: 'Database error checking user'
                    }, { status: 500, headers });
                }

            // ========== VERIFY PASSWORD ==========
            case 'verify-password':
                console.log('Verifying password...');

                const { email: verifyEmail, password: verifyPassword } = body;

                if (!verifyEmail || !verifyPassword) {
                    return NextResponse.json({
                        success: false,
                        error: 'Email and password are required'
                    }, { status: 400, headers });
                }

                if (!isValidEmail(verifyEmail)) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid email format'
                    }, { status: 400, headers });
                }

                try {
                    // Find user by email
                    const user = await usersCollection.findOne({
                        email: verifyEmail.toLowerCase()
                    });

                    if (!user) {
                        return NextResponse.json({
                            success: false,
                            error: 'User not found'
                        }, { status: 404, headers });
                    }

                    // Verify password
                    const validPassword = await bcrypt.compare(verifyPassword, user.password);

                    if (!validPassword) {
                        return NextResponse.json({
                            success: false,
                            error: 'Invalid password'
                        }, { status: 401, headers });
                    }

                    // Generate OTP for login verification
                    const loginOTP = generateOTP();

                    // Store OTP in database
                    const otpId = await storeOTP(otpCollection, {
                        identifier: verifyEmail.toLowerCase(),
                        otp: loginOTP,
                        type: 'login',
                        userId: user._id.toString(),
                        userEmail: user.email,
                        userName: user.name,
                        userPhone: user.phone,
                        purpose: 'login',
                        metadata: {
                            rememberMe: body.rememberMe || false
                        }
                    });

                    console.log(`Generated OTP for login: ${loginOTP}`);
                    console.log(`OTP ID: ${otpId}`);

                    // Send OTP to email
                    const emailResult = await sendOTPEmail(user.email, loginOTP, false);

                    if (!emailResult.success && !emailResult.simulated) {
                        // Delete the stored OTP if email fails
                        await otpCollection.deleteOne({ _id: new ObjectId(otpId) });
                        return NextResponse.json({
                            success: false,
                            error: emailResult.error || 'Failed to send login OTP. Please try again.',
                            debug: emailResult.debug
                        }, { status: 500, headers });
                    }

                    return NextResponse.json({
                        success: true,
                        message: 'Password verified. OTP sent to your email.',
                        otpId: otpId,
                        email: user.email,
                        requiresOTP: true,
                        simulatedEmail: emailResult.simulated || false,
                        otp: emailResult.otp, // Include OTP for testing
                        user: {
                            id: user._id.toString(),
                            email: user.email,
                            name: user.name,
                            isEmailVerified: user.isEmailVerified
                        }
                    }, { headers });

                } catch (error) {
                    console.error('Verify password error:', error);
                    return NextResponse.json({
                        success: false,
                        error: 'Error verifying password'
                    }, { status: 500, headers });
                }

            // ========== SEND EMAIL OTP (for registered users) ==========
            case 'send-email-otp':
                console.log('Sending email OTP to registered user...');
                const { email: emailForOTP } = body;
                const otpPurpose = body.purpose || 'login'; // Use a different variable name

                if (!emailForOTP) {
                    return NextResponse.json({
                        success: false,
                        error: 'Email is required'
                    }, { status: 400, headers });
                }

                // Validate email
                if (!isValidEmail(emailForOTP)) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid email format'
                    }, { status: 400, headers });
                }

                try {
                    // Check if user exists
                    const emailUser = await usersCollection.findOne({
                        email: emailForOTP.toLowerCase()
                    });

                    if (!emailUser) {
                        return NextResponse.json({
                            success: false,
                            error: 'No account found with this email'
                        }, { status: 404, headers });
                    }

                    // Rate limiting check
                    const recentOTP = await otpCollection.findOne({
                        identifier: emailForOTP.toLowerCase(),
                        type: 'email-verification',
                        purpose: otpPurpose, // Use otpPurpose variable
                        createdAt: { $gt: new Date(Date.now() - 30000) } // Last 30 seconds
                    });

                    if (recentOTP) {
                        return NextResponse.json({
                            success: false,
                            error: 'Please wait 30 seconds before requesting a new OTP.'
                        }, { status: 429, headers });
                    }

                    // Generate OTP
                    const emailOTP = generateOTP();

                    // Store OTP in database
                    const storedOTPId = await storeOTP(otpCollection, {
                        identifier: emailForOTP.toLowerCase(),
                        otp: emailOTP,
                        type: 'email-verification',
                        userId: emailUser._id.toString(),
                        userEmail: emailUser.email,
                        userName: emailUser.name,
                        userPhone: emailUser.phone,
                        purpose: otpPurpose, // Use otpPurpose variable
                        metadata: {
                            actionType: otpPurpose // Use otpPurpose variable
                        }
                    });

                    console.log(`OTP generated for ${emailForOTP}: ${emailOTP}`);
                    console.log(`Purpose: ${otpPurpose}, User ID: ${emailUser._id.toString()}`);

                    // Send OTP via email
                    const emailResult = await sendOTPEmail(emailForOTP.toLowerCase(), emailOTP, false);

                    if (!emailResult.success && !emailResult.simulated) {
                        // Delete stored OTP if email fails
                        await otpCollection.deleteOne({ _id: new ObjectId(storedOTPId) });
                        return NextResponse.json({
                            success: false,
                            error: emailResult.error || 'Failed to send OTP. Please try again.',
                            debug: emailResult.debug
                        }, { status: 500, headers });
                    }

                    return NextResponse.json({
                        success: true,
                        message: 'OTP sent to your email',
                        email: emailForOTP.toLowerCase(),
                        otpId: storedOTPId,
                        method: 'email',
                        purpose: otpPurpose, // Include purpose in response
                        simulatedEmail: emailResult.simulated || false,
                        otp: emailResult.otp, // Include OTP for testing
                        user: {
                            id: emailUser._id.toString(),
                            email: emailUser.email,
                            name: emailUser.name,
                            phone: emailUser.phone
                        }
                    }, { headers });

                } catch (error) {
                    console.error('Send email OTP error:', error);
                    return NextResponse.json({
                        success: false,
                        error: 'Error sending OTP',
                        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
                    }, { status: 500, headers });
                }

            // ========== VERIFY EMAIL OTP ==========
            case 'verify-email-otp':
                console.log('Verifying email OTP...');
                const { email: verifyEmailOTP, otp: emailOtp, actionType = 'login' } = body;

                if (!verifyEmailOTP || !emailOtp) {
                    return NextResponse.json({
                        success: false,
                        error: 'Email and OTP are required'
                    }, { status: 400, headers });
                }

                if (!isValidEmail(verifyEmailOTP)) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid email format'
                    }, { status: 400, headers });
                }

                try {
                    // Find the OTP record
                    const otpRecord = await getOTP(
                        otpCollection,
                        verifyEmailOTP.toLowerCase(),
                        emailOtp,
                        'email-verification'
                    );

                    if (!otpRecord) {
                        console.log('No valid OTP found for email:', verifyEmailOTP);

                        // Check if there's an expired or blocked OTP
                        const expiredRecord = await otpCollection.findOne({
                            identifier: verifyEmailOTP.toLowerCase(),
                            otp: emailOtp,
                            type: 'email-verification'
                        });

                        if (expiredRecord) {
                            if (expiredRecord.isExpired) {
                                return NextResponse.json({
                                    success: false,
                                    error: 'OTP has expired. Please request a new OTP.'
                                }, { status: 400, headers });
                            }
                            if (expiredRecord.isBlocked) {
                                return NextResponse.json({
                                    success: false,
                                    error: 'Too many attempts. OTP invalidated.'
                                }, { status: 400, headers });
                            }
                        }

                        return NextResponse.json({
                            success: false,
                            error: 'Invalid or expired OTP. Please request a new OTP.'
                        }, { status: 400, headers });
                    }

                    // Increment attempts on failed verification
                    if (otpRecord.otp !== emailOtp) {
                        await updateOTPAttempts(otpCollection, otpRecord._id.toString());
                        const attemptsLeft = 5 - (otpRecord.attempts + 1);

                        return NextResponse.json({
                            success: false,
                            error: 'Invalid OTP',
                            attemptsLeft: attemptsLeft
                        }, { status: 400, headers });
                    }

                    // OTP is valid, mark as verified
                    await updateOTPAttempts(otpCollection, otpRecord._id.toString(), false);

                    // Get user data
                    const emailVerifiedUser = await usersCollection.findOne({
                        _id: new ObjectId(otpRecord.userId)
                    });

                    if (!emailVerifiedUser) {
                        return NextResponse.json({
                            success: false,
                            error: 'User not found'
                        }, { status: 404, headers });
                    }

                    // Check actionType to determine what to do next
                    switch (actionType) {
                        case 'password-reset':
                            // Generate password reset token
                            const resetToken = "bheema123";
                            const resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

                            // Store reset token in OTP collection
                            await storeOTP(otpCollection, {
                                identifier: resetToken,
                                type: 'password-reset',
                                userId: emailVerifiedUser._id.toString(),
                                userEmail: emailVerifiedUser.email,
                                userName: emailVerifiedUser.name,
                                purpose: 'password-reset',
                                expiresAt: new Date(resetTokenExpiry)
                            });

                            return NextResponse.json({
                                success: true,
                                message: 'Email verified. You can now reset your password.',
                                action: 'password-reset',
                                resetToken: resetToken,
                                user: {
                                    id: emailVerifiedUser._id.toString(),
                                    email: emailVerifiedUser.email,
                                    name: emailVerifiedUser.name
                                }
                            }, { headers });

                        case 'login':
                            // Generate login token
                            const loginToken = await createToken({
                                id: emailVerifiedUser._id.toString(),
                                email: emailVerifiedUser.email,
                                name: emailVerifiedUser.name,
                                role: emailVerifiedUser.role
                            });

                            // Update last login
                            await usersCollection.updateOne(
                                { _id: emailVerifiedUser._id },
                                { $set: { lastLogin: new Date(), updatedAt: new Date() } }
                            );

                            return NextResponse.json({
                                success: true,
                                message: 'Login successful!',
                                token: loginToken,
                                action: 'login',
                                user: {
                                    id: emailVerifiedUser._id.toString(),
                                    email: emailVerifiedUser.email,
                                    name: emailVerifiedUser.name,
                                    phone: emailVerifiedUser.phone,
                                    role: emailVerifiedUser.role,
                                    isEmailVerified: emailVerifiedUser.isEmailVerified
                                }
                            }, { headers });

                        case 'verify-email':
                            // Mark email as verified in database
                            await usersCollection.updateOne(
                                { _id: emailVerifiedUser._id },
                                { $set: { isEmailVerified: true, updatedAt: new Date() } }
                            );

                            return NextResponse.json({
                                success: true,
                                message: 'Email verified successfully!',
                                action: 'verify-email',
                                user: {
                                    id: emailVerifiedUser._id.toString(),
                                    email: emailVerifiedUser.email,
                                    name: emailVerifiedUser.name,
                                    isEmailVerified: true
                                }
                            }, { headers });

                        default:
                            // Just verify OTP without additional action
                            return NextResponse.json({
                                success: true,
                                message: 'OTP verified successfully',
                                user: {
                                    id: emailVerifiedUser._id.toString(),
                                    email: emailVerifiedUser.email,
                                    name: emailVerifiedUser.name
                                }
                            }, { headers });
                    }

                } catch (error) {
                    console.error('Verify email OTP error:', error);
                    return NextResponse.json({
                        success: false,
                        error: 'Error verifying OTP',
                        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
                    }, { status: 500, headers });
                }

            // ========== SEND OTP TO MOBILE ==========
            case 'send-phone-otp':
                console.log('Sending phone OTP...');
                const { phone: phoneForOTP } = body;

                if (!phoneForOTP) {
                    return NextResponse.json({
                        success: false,
                        error: 'Phone number is required'
                    }, { status: 400, headers });
                }

                // Clean and validate phone number
                const cleanedPhone = phoneForOTP.replace(/\D/g, '');
                if (!isValidPhone(cleanedPhone)) {
                    return NextResponse.json({
                        success: false,
                        error: 'Please enter a valid 10-digit phone number'
                    }, { status: 400, headers });
                }

                // Format for storage
                const fullPhoneNumber = formatPhoneNumber(cleanedPhone);
                if (!fullPhoneNumber) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid phone number format'
                    }, { status: 400, headers });
                }

                // Rate limiting check
                const recentPhoneOTP = await otpCollection.findOne({
                    identifier: fullPhoneNumber,
                    type: 'sms',
                    createdAt: { $gt: new Date(Date.now() - 30000) } // Last 30 seconds
                });

                if (recentPhoneOTP) {
                    return NextResponse.json({
                        success: false,
                        error: 'Please wait 30 seconds before requesting a new OTP.'
                    }, { status: 429, headers });
                }

                // Check if user exists
                const phoneUser = await usersCollection.findOne({
                    phone: fullPhoneNumber
                });

                const userExists = !!phoneUser;

                // Generate OTP
                const phoneOTP = generateOTP();

                // Store OTP in database
                const phoneOTPId = await storeOTP(otpCollection, {
                    identifier: fullPhoneNumber,
                    otp: phoneOTP,
                    type: 'sms',
                    userId: phoneUser?._id?.toString(),
                    userEmail: phoneUser?.email,
                    userName: phoneUser?.name,
                    userPhone: fullPhoneNumber,
                    purpose: 'phone-verification',
                    metadata: {
                        userExists: userExists
                    }
                });

                console.log(`OTP generated for ${fullPhoneNumber}: ${phoneOTP}`);
                console.log(`User exists: ${userExists}`);

                // Send OTP via SMS
                const smsResult = await sendSMS(cleanedPhone, phoneOTP);

                if (!smsResult.success && !smsResult.simulated) {
                    // Fallback to email OTP if SMS fails and user has email
                    if (phoneUser?.email) {
                        console.log('SMS failed, trying email fallback...');
                        const emailResult = await sendOTPEmail(phoneUser.email, phoneOTP, false);
                        if (!emailResult.success && !emailResult.simulated) {
                            // Delete stored OTP if both methods fail
                            await otpCollection.deleteOne({ _id: new ObjectId(phoneOTPId) });
                            return NextResponse.json({
                                success: false,
                                error: 'Failed to send OTP via SMS or email. Please try again.',
                                smsError: smsResult.error,
                                emailError: emailResult.error
                            }, { status: 500, headers });
                        }
                        return NextResponse.json({
                            success: true,
                            message: 'OTP sent to your registered email',
                            phone: fullPhoneNumber,
                            otpId: phoneOTPId,
                            method: 'email',
                            userExists: userExists,
                            simulatedEmail: emailResult.simulated || false,
                            otp: emailResult.otp
                        }, { headers });
                    }

                    // Delete stored OTP if SMS fails and no email fallback
                    await otpCollection.deleteOne({ _id: new ObjectId(phoneOTPId) });
                    return NextResponse.json({
                        success: false,
                        error: smsResult.error || 'Failed to send OTP via SMS. Please try email login.',
                        suggestions: smsResult.suggestions
                    }, { status: 500, headers });
                }

                return NextResponse.json({
                    success: true,
                    message: 'OTP sent to your phone',
                    phone: fullPhoneNumber,
                    otpId: phoneOTPId,
                    method: 'sms',
                    provider: smsResult.provider,
                    userExists: userExists,
                    simulatedSMS: smsResult.simulated || false,
                    otp: smsResult.otp
                }, { headers });

            // ========== VERIFY PHONE OTP ==========
            case 'verify-phone-otp':
                console.log('Verifying phone OTP...');
                const { phone: verifyPhone, otp: phoneOtp, name: userName } = body;

                if (!verifyPhone || !phoneOtp) {
                    return NextResponse.json({
                        success: false,
                        error: 'Phone and OTP are required'
                    }, { status: 400, headers });
                }

                // Format phone for lookup
                const formattedPhone = verifyPhone.startsWith('+91')
                    ? verifyPhone
                    : formatPhoneNumber(verifyPhone);

                if (!formattedPhone) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid phone number format'
                    }, { status: 400, headers });
                }

                try {
                    // Find the OTP record
                    const otpRecord = await getOTP(
                        otpCollection,
                        formattedPhone,
                        phoneOtp,
                        'sms'
                    );

                    if (!otpRecord) {
                        console.log('No valid OTP found for phone:', formattedPhone);

                        // Check if there's an expired or blocked OTP
                        const expiredRecord = await otpCollection.findOne({
                            identifier: formattedPhone,
                            otp: phoneOtp,
                            type: 'sms'
                        });

                        if (expiredRecord) {
                            if (expiredRecord.isExpired) {
                                return NextResponse.json({
                                    success: false,
                                    error: 'OTP has expired. Please request a new OTP.'
                                }, { status: 400, headers });
                            }
                            if (expiredRecord.isBlocked) {
                                return NextResponse.json({
                                    success: false,
                                    error: 'Too many attempts. OTP invalidated.'
                                }, { status: 400, headers });
                            }
                        }

                        return NextResponse.json({
                            success: false,
                            error: 'Invalid or expired OTP. Please request a new OTP.'
                        }, { status: 400, headers });
                    }

                    // Increment attempts on failed verification
                    if (otpRecord.otp !== phoneOtp) {
                        await updateOTPAttempts(otpCollection, otpRecord._id.toString());
                        const attemptsLeft = 5 - (otpRecord.attempts + 1);

                        return NextResponse.json({
                            success: false,
                            error: 'Invalid OTP',
                            attemptsLeft: attemptsLeft
                        }, { status: 400, headers });
                    }

                    // OTP is valid, mark as verified
                    await updateOTPAttempts(otpCollection, otpRecord._id.toString(), false);

                    let currentUser = otpRecord.userData ?
                        await usersCollection.findOne({ _id: new ObjectId(otpRecord.userId) }) :
                        null;
                    let isNewUser = false;

                    if (currentUser) {
                        // Existing user - update last login
                        await usersCollection.updateOne(
                            { _id: currentUser._id },
                            { $set: { lastLogin: new Date(), updatedAt: new Date() } }
                        );
                    } else {
                        // Check if phone already exists (race condition)
                        const existingPhoneUser = await usersCollection.findOne({
                            phone: formattedPhone
                        });

                        if (existingPhoneUser) {
                            currentUser = existingPhoneUser;
                        } else {
                            // Create new user
                            const newUser = {
                                name: userName,
                                phone: formattedPhone,
                                email: body.email || '',
                                role: 'user',
                                isEmailVerified: false,
                                isPhoneVerified: true,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                lastLogin: new Date()
                            };

                            const result = await usersCollection.insertOne(newUser);
                            currentUser = { ...newUser, _id: result.insertedId };
                            isNewUser = true;
                        }
                    }

                    // Generate token
                    const phoneToken = await createToken({
                        id: currentUser._id.toString(),
                        phone: currentUser.phone,
                        email: currentUser.email,
                        name: currentUser.name,
                        role: currentUser.role,
                        isPhoneVerified: true
                    });

                    return NextResponse.json({
                        success: true,
                        message: isNewUser ? 'Account created successfully!' : 'Login successful!',
                        token: phoneToken,
                        user: {
                            id: currentUser._id.toString(),
                            phone: currentUser.phone,
                            email: currentUser.email,
                            name: currentUser.name,
                            role: currentUser.role,
                            isEmailVerified: currentUser.isEmailVerified,
                            isPhoneVerified: true
                        },
                        isNewUser: isNewUser
                    }, { headers });

                } catch (error) {
                    console.error('Verify phone OTP error:', error);
                    return NextResponse.json({
                        success: false,
                        error: 'Error verifying OTP'
                    }, { status: 500, headers });
                }

            // ========== REGISTER WITH EMAIL ==========
            case 'register':
                console.log('Processing registration...');
                const registerData = { ...body };
                delete registerData.action;

                const { error: regError, value: regData } = validateData(registerSchema, registerData);
                if (regError) {
                    console.log('Registration validation error:', regError);
                    return NextResponse.json({
                        success: false,
                        error: regError[0].message,
                        details: regError
                    }, { status: 400, headers });
                }

                // For phone-only registration, generate a temporary email
                let userEmail = regData.email;
                if (!userEmail && regData.phone) {
                    const cleanedPhone = regData.phone.replace(/\D/g, '');
                    userEmail = `phone_${cleanedPhone}@temp.realbeez.com`;
                }

                // Validate email format if provided, or use the generated one
                if (!userEmail.includes('@')) {
                    return NextResponse.json({
                        success: false,
                        error: 'Valid email is required'
                    }, { status: 400, headers });
                }

                // Validate phone
                if (!isValidPhone(regData.phone)) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid phone number. Must be 10 digits.'
                    }, { status: 400, headers });
                }

                const formattedPhoneReg = formatPhoneNumber(regData.phone);

                // Check if user already exists (check both email and phone)
                if (userEmail !== `phone_${regData.phone.replace(/\D/g, '')}@temp.realbeez.com`) {
                    const existingEmail = await usersCollection.findOne({
                        email: userEmail.toLowerCase()
                    });
                    if (existingEmail) {
                        return NextResponse.json({
                            success: false,
                            error: 'Email already registered'
                        }, { status: 400, headers });
                    }
                }

                const existingPhoneReg = await usersCollection.findOne({
                    phone: formattedPhoneReg
                });
                if (existingPhoneReg) {
                    return NextResponse.json({
                        success: false,
                        error: 'Phone number already registered'
                    }, { status: 400, headers });
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(regData.password, 10);

                // Generate OTP for verification (use SMS for phone-only users)
                const emailVerificationOTP = generateOTP();

                // Generate a unique registration token
                const registrationToken = "bheema123";

                // Store registration data and OTP in database
                const tempUserData = {
                    name: regData.name,
                    email: userEmail.toLowerCase(),
                    password: hashedPassword,
                    phone: formattedPhoneReg,
                    role: regData.role || 'user',
                    purpose: regData.purpose || 'sell',
                    propertyType: regData.propertyType || 'residential',
                    specificType: regData.specificType || 'apartment',
                    isPhoneOnly: !regData.email // Flag to identify phone-only users
                };

                // Store OTP in database
                const registrationOTPId = await storeOTP(otpCollection, {
                    identifier: registrationToken,
                    otp: emailVerificationOTP,
                    type: 'registration',
                    userData: tempUserData,
                    userEmail: tempUserData.email,
                    userName: tempUserData.name,
                    userPhone: tempUserData.phone,
                    purpose: 'registration',
                    metadata: {
                        tempUserData: tempUserData
                    }
                });

                console.log(`OTP generated for registration: ${emailVerificationOTP}`);
                console.log(`Registration Token: ${registrationToken}`);

                // Send OTP - if user provided email, send to email, otherwise send SMS
                let registrationResult;
                if (regData.email) {
                    // Send to email
                    registrationResult = await sendOTPEmail(regData.email.toLowerCase(), emailVerificationOTP, false);
                } else {
                    // Send SMS for phone-only users
                    registrationResult = await sendSMS(regData.phone, emailVerificationOTP);
                }

                if (!registrationResult.success && !registrationResult.simulated) {
                    // Delete stored OTP if sending fails
                    await otpCollection.deleteOne({ _id: new ObjectId(registrationOTPId) });
                    return NextResponse.json({
                        success: false,
                        error: registrationResult.error || 'Failed to send verification OTP. Please try again.',
                        debug: registrationResult.debug
                    }, { status: 500, headers });
                }

                return NextResponse.json({
                    success: true,
                    message: regData.email ? 'Verification OTP sent to your email' : 'Verification OTP sent to your phone',
                    registrationToken: registrationToken,
                    email: userEmail.toLowerCase(),
                    method: regData.email ? 'email' : 'sms',
                    simulatedEmail: registrationResult.simulated || false,
                    otp: registrationResult.otp
                }, { headers });

            // ========== VERIFY REGISTRATION OTP ==========
            case 'verify-registration-otp':
                console.log('Verifying registration OTP...');
                const { registrationToken: verifyRegToken, otp: registrationOtp } = body;

                if (!verifyRegToken || !registrationOtp) {
                    return NextResponse.json({
                        success: false,
                        error: 'Verification code required'
                    }, { status: 400, headers });
                }

                try {
                    // Find the registration OTP record
                    const otpRecord = await getOTP(
                        otpCollection,
                        verifyRegToken,
                        registrationOtp,
                        'registration'
                    );

                    if (!otpRecord) {
                        console.log('No valid registration OTP found for token:', verifyRegToken);

                        // Check if there's an expired or blocked OTP
                        const expiredRecord = await otpCollection.findOne({
                            identifier: verifyRegToken,
                            otp: registrationOtp,
                            type: 'registration'
                        });

                        if (expiredRecord) {
                            if (expiredRecord.isExpired) {
                                return NextResponse.json({
                                    success: false,
                                    error: 'Verification OTP has expired'
                                }, { status: 400, headers });
                            }
                            if (expiredRecord.isBlocked) {
                                return NextResponse.json({
                                    success: false,
                                    error: 'Too many attempts. Please restart registration.'
                                }, { status: 400, headers });
                            }
                        }

                        return NextResponse.json({
                            success: false,
                            error: 'Invalid or expired verification request'
                        }, { status: 400, headers });
                    }

                    // Increment attempts on failed verification
                    if (otpRecord.otp !== registrationOtp) {
                        await updateOTPAttempts(otpCollection, otpRecord._id.toString());
                        const attemptsLeft = 5 - (otpRecord.attempts + 1);

                        return NextResponse.json({
                            success: false,
                            error: 'Invalid OTP',
                            attemptsLeft: attemptsLeft
                        }, { status: 400, headers });
                    }

                    // OTP is valid, mark as verified
                    await updateOTPAttempts(otpCollection, otpRecord._id.toString(), false);

                    const userData = otpRecord.metadata.tempUserData;

                    // Check again if user exists (race condition)
                    const existingEmailCheck = await usersCollection.findOne({
                        email: userData.email
                    });
                    if (existingEmailCheck) {
                        return NextResponse.json({
                            success: false,
                            error: 'Email already registered'
                        }, { status: 400, headers });
                    }

                    const existingPhoneCheck = await usersCollection.findOne({
                        phone: userData.phone
                    });
                    if (existingPhoneCheck) {
                        return NextResponse.json({
                            success: false,
                            error: 'Phone number already registered'
                        }, { status: 400, headers });
                    }

                    // Create user in database
                    const newUser = {
                        ...userData,
                        isEmailVerified: true,
                        isPhoneVerified: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        lastLogin: new Date()
                    };

                    const result = await usersCollection.insertOne(newUser);

                    // Generate token
                    const userToken = await createToken({
                        id: result.insertedId.toString(),
                        email: newUser.email,
                        name: newUser.name,
                        role: newUser.role,
                        isEmailVerified: true
                    });

                    // Send welcome email
                    try {
                        await sendOTPEmail(newUser.email, '', true);
                    } catch (emailError) {
                        console.error('Failed to send welcome email:', emailError);
                        // Don't fail registration if welcome email fails
                    }

                    return NextResponse.json({
                        success: true,
                        message: 'Registration successful!',
                        token: userToken,
                        user: {
                            id: result.insertedId.toString(),
                            email: newUser.email,
                            name: newUser.name,
                            phone: newUser.phone,
                            role: newUser.role,
                            isEmailVerified: true,
                            isPhoneVerified: false
                        }
                    }, { headers });

                } catch (error) {
                    console.error('Verify registration OTP error:', error);
                    return NextResponse.json({
                        success: false,
                        error: 'Error verifying registration OTP'
                    }, { status: 500, headers });
                }

            // ========== LOGIN WITH EMAIL & PASSWORD ==========
            case 'login':
                console.log('Processing login...');
                const loginData = { ...body };
                delete loginData.action;

                const { error: loginError, value: loginValidatedData } = validateData(loginSchema, loginData);
                if (loginError) {
                    return NextResponse.json({
                        success: false,
                        error: loginError[0].message
                    }, { status: 400, headers });
                }

                // Validate email
                if (!isValidEmail(loginValidatedData.email)) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid email format'
                    }, { status: 400, headers });
                }

                // Find user by email
                const userLogin = await usersCollection.findOne({
                    email: loginValidatedData.email.toLowerCase()
                });

                if (!userLogin) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid credentials'
                    }, { status: 401, headers });
                }

                // Verify password
                const validPasswordLogin = await bcrypt.compare(loginValidatedData.password, userLogin.password);
                if (!validPasswordLogin) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid credentials'
                    }, { status: 401, headers });
                }

                // Generate OTP for login verification
                const loginVerificationOTP = generateOTP();

                // Store login OTP in database
                const loginSessionId = "bheema123";
                const loginOTPId = await storeOTP(otpCollection, {
                    identifier: loginSessionId,
                    otp: loginVerificationOTP,
                    type: 'login',
                    userId: userLogin._id.toString(),
                    userEmail: userLogin.email,
                    userName: userLogin.name,
                    purpose: 'login',
                    metadata: {
                        rememberMe: loginValidatedData.rememberMe || false
                    }
                });

                console.log(`OTP generated for login: ${loginVerificationOTP}`);
                console.log(`Session ID: ${loginSessionId}`);

                // Send OTP to email
                const loginEmailResult = await sendOTPEmail(userLogin.email, loginVerificationOTP, false);

                if (!loginEmailResult.success && !loginEmailResult.simulated) {
                    // Delete stored OTP if email fails
                    await otpCollection.deleteOne({ _id: new ObjectId(loginOTPId) });
                    return NextResponse.json({
                        success: false,
                        error: loginEmailResult.error || 'Failed to send login OTP. Please try again.',
                        debug: loginEmailResult.debug
                    }, { status: 500, headers });
                }

                return NextResponse.json({
                    success: true,
                    message: 'Login OTP sent to your email',
                    sessionId: loginSessionId,
                    otpId: loginOTPId,
                    email: userLogin.email,
                    requiresOTP: true,
                    simulatedEmail: loginEmailResult.simulated || false,
                    otp: loginEmailResult.otp
                }, { headers });

            // ========== VERIFY LOGIN OTP ==========
            case 'verify-login-otp':
                console.log('Verifying login OTP...');
                const { sessionId, otp: loginOtp, email: loginEmail } = body;

                // Accept either sessionId OR email
                if ((!sessionId && !loginEmail) || !loginOtp) {
                    return NextResponse.json({
                        success: false,
                        error: 'Either session ID or email with OTP are required'
                    }, { status: 400, headers });
                }

                try {
                    let otpRecord;

                    if (sessionId) {
                        // Lookup by sessionId
                        otpRecord = await getOTP(otpCollection, sessionId, loginOtp, 'login');
                        if (!otpRecord) {
                            console.log('Invalid session ID or OTP');
                            return NextResponse.json({
                                success: false,
                                error: 'Invalid or expired login session'
                            }, { status: 400, headers });
                        }
                    } else if (loginEmail) {
                        // Lookup by email
                        // First, find any unverified OTP for this email
                        const otpRecords = await otpCollection.find({
                            identifier: loginEmail.toLowerCase(),
                            type: { $in: ['login', 'email-verification'] },
                            isVerified: false
                        }).sort({ createdAt: -1 }).limit(1).toArray();

                        if (otpRecords.length === 0) {
                            return NextResponse.json({
                                success: false,
                                error: 'No active OTP found for this email'
                            }, { status: 400, headers });
                        }

                        otpRecord = otpRecords[0];

                        // Check if OTP matches
                        if (otpRecord.otp !== loginOtp) {
                            await updateOTPAttempts(otpCollection, otpRecord._id.toString());
                            const attemptsLeft = 5 - (otpRecord.attempts + 1);

                            return NextResponse.json({
                                success: false,
                                error: 'Invalid OTP',
                                attemptsLeft: attemptsLeft
                            }, { status: 400, headers });
                        }
                    }

                    // Check if OTP is already verified or expired
                    if (!otpRecord || otpRecord.isVerified || new Date() > otpRecord.expiresAt) {
                        return NextResponse.json({
                            success: false,
                            error: 'OTP has expired or already used'
                        }, { status: 400, headers });
                    }

                    // Mark OTP as verified
                    await updateOTPAttempts(otpCollection, otpRecord._id.toString(), false);

                    // Get user data
                    let loginUser;
                    if (otpRecord.userId) {
                        loginUser = await usersCollection.findOne({
                            _id: new ObjectId(otpRecord.userId)
                        });
                    } else if (loginEmail) {
                        loginUser = await usersCollection.findOne({
                            email: loginEmail.toLowerCase()
                        });
                    }

                    if (!loginUser) {
                        return NextResponse.json({
                            success: false,
                            error: 'User not found'
                        }, { status: 404, headers });
                    }

                    // Generate token
                    const expiryTime = otpRecord.metadata?.rememberMe ? '30d' : '7d';
                    const authToken = await createToken({
                        id: loginUser._id.toString(),
                        email: loginUser.email,
                        name: loginUser.name,
                        role: loginUser.role
                    }, expiryTime);

                    // Update last login
                    await usersCollection.updateOne(
                        { _id: loginUser._id },
                        { $set: { lastLogin: new Date(), updatedAt: new Date() } }
                    );

                    return NextResponse.json({
                        success: true,
                        message: 'Login successful',
                        token: authToken,
                        user: {
                            id: loginUser._id.toString(),
                            email: loginUser.email,
                            name: loginUser.name,
                            phone: loginUser.phone,
                            role: loginUser.role,
                            isEmailVerified: loginUser.isEmailVerified
                        }
                    }, { headers });

                } catch (error) {
                    console.error('Verify login OTP error:', error);
                    return NextResponse.json({
                        success: false,
                        error: 'Error verifying login OTP'
                    }, { status: 500, headers });
                }

            // ========== RESEND OTP ==========
            case 'resend-otp':
                console.log('Resending OTP...');
                const { identifier, type, purpose = 'login' } = body;

                if (!identifier || !type) {
                    return NextResponse.json({
                        success: false,
                        error: 'Identifier and type are required'
                    }, { status: 400, headers });
                }

                try {
                    switch (type) {
                        case 'email-login':
                            console.log('Resending email login OTP for:', identifier);

                            const resendUser = await usersCollection.findOne({
                                email: identifier.toLowerCase()
                            });

                            if (!resendUser) {
                                return NextResponse.json({
                                    success: false,
                                    error: 'User not found'
                                }, { status: 404, headers });
                            }

                            // Rate limiting check
                            const recentResendOTP = await otpCollection.findOne({
                                identifier: identifier.toLowerCase(),
                                type: 'email-verification',
                                purpose: purpose,
                                createdAt: { $gt: new Date(Date.now() - 30000) } // Last 30 seconds
                            });

                            if (recentResendOTP) {
                                return NextResponse.json({
                                    success: false,
                                    error: 'Please wait 30 seconds before requesting a new OTP.'
                                }, { status: 429, headers });
                            }

                            const newOTP = generateOTP();

                            // Store new OTP in database
                            const resendOTPId = await storeOTP(otpCollection, {
                                identifier: identifier.toLowerCase(),
                                otp: newOTP,
                                type: 'email-verification',
                                userId: resendUser._id.toString(),
                                userEmail: resendUser.email,
                                userName: resendUser.name,
                                userPhone: resendUser.phone,
                                purpose: purpose,
                                metadata: {
                                    actionType: purpose
                                }
                            });

                            console.log(`Resending OTP: ${newOTP} to ${resendUser.email} (Purpose: ${purpose})`);

                            const resendEmailResult = await sendOTPEmail(resendUser.email, newOTP, false);

                            if (!resendEmailResult.success && !resendEmailResult.simulated) {
                                // Delete stored OTP if email fails
                                await otpCollection.deleteOne({ _id: new ObjectId(resendOTPId) });
                                return NextResponse.json({
                                    success: false,
                                    error: resendEmailResult.error || 'Failed to resend OTP'
                                }, { status: 500, headers });
                            }

                            return NextResponse.json({
                                success: true,
                                message: 'OTP resent to email',
                                email: identifier.toLowerCase(),
                                otpId: resendOTPId,
                                purpose: purpose,
                                simulatedEmail: resendEmailResult.simulated || false,
                                otp: resendEmailResult.otp,
                                user: {
                                    id: resendUser._id.toString(),
                                    email: resendUser.email,
                                    name: resendUser.name
                                }
                            }, { headers });

                        case 'phone':
                            console.log('Resending phone OTP for:', identifier);

                            // Phone OTP resend logic
                            const cleanedResendPhone = identifier.replace(/\D/g, '');
                            if (!isValidPhone(cleanedResendPhone)) {
                                return NextResponse.json({
                                    success: false,
                                    error: 'Invalid phone number'
                                }, { status: 400, headers });
                            }

                            const phoneOTPResend = generateOTP();
                            const fullResendPhone = formatPhoneNumber(cleanedResendPhone);

                            // Check rate limiting
                            const recentPhoneResendOTP = await otpCollection.findOne({
                                identifier: fullResendPhone,
                                type: 'sms',
                                createdAt: { $gt: new Date(Date.now() - 30000) } // Last 30 seconds
                            });

                            if (recentPhoneResendOTP) {
                                return NextResponse.json({
                                    success: false,
                                    error: 'Please wait 30 seconds before requesting a new OTP.'
                                }, { status: 429, headers });
                            }

                            // Check if user exists
                            const resendPhoneUser = await usersCollection.findOne({
                                phone: fullResendPhone
                            });

                            // Store new OTP in database
                            const phoneResendOTPId = await storeOTP(otpCollection, {
                                identifier: fullResendPhone,
                                otp: phoneOTPResend,
                                type: 'sms',
                                userId: resendPhoneUser?._id?.toString(),
                                userEmail: resendPhoneUser?.email,
                                userName: resendPhoneUser?.name,
                                userPhone: fullResendPhone,
                                purpose: 'phone-verification',
                                metadata: {
                                    userExists: !!resendPhoneUser
                                }
                            });

                            console.log(`Resending phone OTP: ${phoneOTPResend} to ${fullResendPhone}`);

                            // For development, use simulated SMS
                            console.log(`📱 [SIMULATED] Resending SMS would be sent to: +91${cleanedResendPhone}`);
                            console.log(`📱 [SIMULATED] Resending OTP: ${phoneOTPResend}`);

                            const smsResendResult = {
                                success: true,
                                provider: 'simulated',
                                simulated: true,
                                message: 'SMS simulated (no SMS provider configured)',
                                otp: phoneOTPResend,
                                phone: fullResendPhone
                            };

                            // If you want to use actual SMS, uncomment:
                            // const smsResendResult = await sendSMS(cleanedResendPhone, phoneOTPResend);

                            if (!smsResendResult.success && !smsResendResult.simulated) {
                                // Fallback to email if available
                                if (resendPhoneUser?.email) {
                                    const emailResendResult = await sendOTPEmail(resendPhoneUser.email, phoneOTPResend, false);
                                    if (emailResendResult.success || emailResendResult.simulated) {
                                        return NextResponse.json({
                                            success: true,
                                            message: 'OTP sent to your registered email',
                                            phone: fullResendPhone,
                                            otpId: phoneResendOTPId,
                                            method: 'email',
                                            simulatedEmail: emailResendResult.simulated || false,
                                            otp: emailResendResult.otp
                                        }, { headers });
                                    }
                                }

                                // Delete stored OTP if both methods fail
                                await otpCollection.deleteOne({ _id: new ObjectId(phoneResendOTPId) });
                                return NextResponse.json({
                                    success: false,
                                    error: smsResendResult.error || 'Failed to resend OTP'
                                }, { status: 500, headers });
                            }

                            return NextResponse.json({
                                success: true,
                                message: 'OTP resent to your phone',
                                phone: fullResendPhone,
                                otpId: phoneResendOTPId,
                                method: 'sms',
                                provider: smsResendResult.provider,
                                simulatedSMS: smsResendResult.simulated || false,
                                otp: smsResendResult.otp
                            }, { headers });

                        case 'registration':
                            console.log('Resending registration OTP for token:', identifier);

                            // Handle registration OTP resend using registrationToken
                            const registrationRecord = await otpCollection.findOne({
                                identifier: identifier,
                                type: 'registration',
                                isVerified: false
                            });

                            if (!registrationRecord) {
                                return NextResponse.json({
                                    success: false,
                                    error: 'Registration session expired. Please restart registration.'
                                }, { status: 400, headers });
                            }

                            // Rate limiting check
                            if (registrationRecord.createdAt &&
                                (Date.now() - registrationRecord.createdAt.getTime()) < 30000) {
                                return NextResponse.json({
                                    success: false,
                                    error: 'Please wait 30 seconds before requesting a new OTP.'
                                }, { status: 429, headers });
                            }

                            const registrationOTP = generateOTP();

                            // Update stored registration with new OTP
                            await otpCollection.updateOne(
                                { _id: registrationRecord._id },
                                {
                                    $set: {
                                        otp: registrationOTP,
                                        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                                        attempts: 0,
                                        updatedAt: new Date()
                                    }
                                }
                            );

                            console.log(`Resending registration OTP: ${registrationOTP} to ${registrationRecord.userEmail}`);

                            const registrationEmailResult = await sendOTPEmail(registrationRecord.userEmail, registrationOTP, false);

                            if (!registrationEmailResult.success && !registrationEmailResult.simulated) {
                                return NextResponse.json({
                                    success: false,
                                    error: registrationEmailResult.error || 'Failed to resend OTP'
                                }, { status: 500, headers });
                            }

                            return NextResponse.json({
                                success: true,
                                message: 'Registration OTP resent to your email',
                                registrationToken: identifier,
                                simulatedEmail: registrationEmailResult.simulated || false,
                                otp: registrationEmailResult.otp
                            }, { headers });

                        default:
                            console.error('Invalid resend type:', type);
                            return NextResponse.json({
                                success: false,
                                error: 'Invalid resend type'
                            }, { status: 400, headers });
                    }
                } catch (error) {
                    console.error('Resend OTP error:', error);
                    return NextResponse.json({
                        success: false,
                        error: 'Error resending OTP'
                    }, { status: 500, headers });
                }

            default:
                return NextResponse.json({
                    success: false,
                    error: 'Invalid action'
                }, { status: 400, headers });
        }
    } catch (error) {
        console.error('❌ API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500, headers });
    }
}