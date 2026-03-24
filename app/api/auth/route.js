// app/api/auth/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import nodemailer from 'nodemailer';
import { ObjectId } from 'mongodb';
// import { registerSchema, loginSchema, checkUserSchema, validateData } from '@/app/lib/validation';

// Generate random OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate verification token
const generateVerificationToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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

        if (!emailUser || !emailPass) {
            console.warn('Email credentials not set. Email will be simulated.');
            return null;
        }

        const isGmail = emailUser.includes('@gmail.com');

        const transporter = nodemailer.createTransport({
            service: isGmail ? 'gmail' : 'SMTP',
            host: isGmail ? 'smtp.gmail.com' : process.env.EMAIL_HOST,
            port: isGmail ? 587 : (process.env.EMAIL_PORT || 587),
            secure: false,
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

// Send OTP Email (for verified users)
const sendOTPEmail = async (email, otp) => {
    console.log('Sending OTP email to:', email);

    if (!transporter) {
        console.log('📧 [SIMULATED] OTP email would be sent to:', email);
        console.log('📧 [SIMULATED] OTP:', otp);
        return {
            success: true,
            simulated: true,
            otp: otp
        };
    }

    try {
        const subject = `Your Login OTP Code: ${otp} - Real Beez`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #DAA520 0%, #c4941a 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">Real Beez</h1>
                </div>
                <div style="padding: 40px; background: #f9f9f9; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                    <h2 style="color: #333; margin-top: 0;">Your Login OTP</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        Use this OTP to complete your login:
                    </p>
                    <div style="background: white; padding: 25px; border-radius: 10px; text-align: center; border: 2px dashed #DAA520; margin: 25px 0;">
                        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #DAA520; margin: 15px 0; font-family: monospace;">
                            ${otp}
                        </div>
                        <div style="color: #888; font-size: 12px; margin-top: 10px;">
                            Valid for 10 minutes
                        </div>
                    </div>
                    <p style="color: #666; font-size: 14px; line-height: 1.6;">
                        This OTP is valid for <strong>10 minutes</strong>. Please do not share this code with anyone.
                    </p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"Real Beez" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: html,
            text: `Your Real Beez login OTP is: ${otp}. Valid for 10 minutes.`,
        };

        await transporter.verify();
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ OTP email sent successfully');
        return {
            success: true,
            messageId: info.messageId,
            otp: otp
        };
    } catch (error) {
        console.error('❌ Error sending OTP email:', error.message);
        return {
            success: false,
            error: 'Failed to send OTP email',
            otp: otp
        };
    }
};

// Send Verification Email with Link
const sendVerificationEmail = async (email, verificationToken) => {
    console.log('Sending verification email to:', email);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    if (!transporter) {
        console.log('📧 [SIMULATED] Verification email would be sent to:', email);
        console.log('📧 [SIMULATED] Verification Link:', verificationLink);
        return {
            success: true,
            simulated: true,
            verificationLink: verificationLink
        };
    }

    try {
        const subject = 'Verify Your Email Address - Real Beez';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #DAA520 0%, #c4941a 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">Real Beez</h1>
                </div>
                <div style="padding: 40px; background: #f9f9f9; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                    <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        Thank you for registering with Real Beez! Please verify your email address to complete your registration and start using our services.
                    </p>
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${verificationLink}" style="background-color: #DAA520; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                            Verify Email Address
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px; line-height: 1.6;">
                        If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="color: #DAA520; font-size: 12px; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">
                        ${verificationLink}
                    </p>
                    <p style="color: #999; font-size: 12px; margin-top: 20px;">
                        This verification link is valid for 24 hours. If you didn't create an account with Real Beez, please ignore this email.
                    </p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"Real Beez" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: html,
            text: `Please verify your email address by clicking this link: ${verificationLink}`,
        };

        await transporter.verify();
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Verification email sent successfully');
        return {
            success: true,
            messageId: info.messageId,
            verificationLink: verificationLink
        };
    } catch (error) {
        console.error('❌ Error sending verification email:', error.message);
        return {
            success: false,
            error: 'Failed to send verification email'
        };
    }
};

// Send SMS
const sendSMS = async (phone, otp) => {
    console.log('Attempting to send SMS to:', phone);

    if (!phone || phone.length !== 10) {
        return { success: false, error: 'Invalid phone number' };
    }

    const phoneNumber = phone.replace(/\D/g, '');
    if (phoneNumber.length !== 10) {
        return { success: false, error: 'Phone number must be 10 digits' };
    }

    console.log(`📱 [SIMULATED] SMS would be sent to: +91${phoneNumber}`);
    console.log(`📱 [SIMULATED] OTP: ${otp}`);

    return {
        success: true,
        simulated: true,
        otp: otp
    };
};

// Helper functions
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidPhone = (phone) => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
};

const formatPhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `+91${cleaned}`;
    }
    return null;
};

// Store OTP/Token in database
const storeOTP = async (otpCollection, data) => {
    const otpData = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isVerified: false,
        attempts: 0
    };

    const result = await otpCollection.insertOne(otpData);
    return result.insertedId.toString();
};

// Store verification token (24 hours expiry)
const storeVerificationToken = async (otpCollection, data) => {
    const tokenData = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isVerified: false
    };

    const result = await otpCollection.insertOne(tokenData);
    return result.insertedId.toString();
};

// Get verification token from database
const getVerificationToken = async (otpCollection, token, type = 'email-verification') => {
    const query = { identifier: token, type, isVerified: false };
    const tokenRecord = await otpCollection.findOne(query);

    if (!tokenRecord) return null;

    if (new Date() > tokenRecord.expiresAt) {
        await otpCollection.updateOne(
            { _id: tokenRecord._id },
            { $set: { isExpired: true, updatedAt: new Date() } }
        );
        return null;
    }

    return tokenRecord;
};

// Get OTP from database
const getOTP = async (otpCollection, identifier, otp, type = 'login-otp') => {
    const query = { identifier, otp, type, isVerified: false };
    const otpRecord = await otpCollection.findOne(query);

    if (!otpRecord) return null;

    if (new Date() > otpRecord.expiresAt) {
        await otpCollection.updateOne(
            { _id: otpRecord._id },
            { $set: { isExpired: true, updatedAt: new Date() } }
        );
        return null;
    }

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
        console.log(`Cleaned ${result.deletedCount} expired records`);
    }
};

// Main API handler
export async function POST(request) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
        return new NextResponse(null, { headers, status: 200 });
    }

    try {
        let body;
        try {
            body = await request.json();
            console.log('Request Body:', JSON.stringify(body, null, 2));
        } catch (parseError) {
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

        // Connect to database
        let client, db, usersCollection, otpCollection;
        try {
            console.log('Connecting to database...');
            client = await clientPromise;
            db = client.db();
            await db.command({ ping: 1 });
            usersCollection = db.collection('users');
            otpCollection = db.collection('otp_logs');

            // Create indexes if they don't exist
            await otpCollection.createIndex({ identifier: 1, type: 1 });
            await otpCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

            console.log('✅ Database connected successfully');
        } catch (dbError) {
            console.error('Database connection error:', dbError);
            return NextResponse.json({
                success: false,
                error: 'Database connection failed. Please try again later.'
            }, { status: 500, headers });
        }

        // Clean expired OTPs
        await cleanExpiredOTPs(otpCollection);

        switch (action) {
            // ========== SEND OTP FOR LOGIN (ONLY FOR VERIFIED USERS) ==========
            case 'send-login-otp': {
                console.log('Sending login OTP...');
                const { email: loginEmail } = body;

                if (!loginEmail) {
                    return NextResponse.json({
                        success: false,
                        error: 'Email is required'
                    }, { status: 400, headers });
                }

                if (!isValidEmail(loginEmail)) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid email format'
                    }, { status: 400, headers });
                }

                try {
                    const user = await usersCollection.findOne({
                        email: loginEmail.toLowerCase()
                    });

                    if (!user) {
                        return NextResponse.json({
                            success: false,
                            error: 'No account found with this email'
                        }, { status: 404, headers });
                    }

                    // Check if email is verified
                    if (!user.isEmailVerified) {
                        // Send verification link instead of OTP
                        const verificationToken = generateVerificationToken();

                        await storeVerificationToken(otpCollection, {
                            identifier: verificationToken,
                            type: 'email-verification',
                            userId: user._id.toString(),
                            userEmail: user.email,
                            userName: user.name,
                            purpose: 'verify-email'
                        });

                        const verificationResult = await sendVerificationEmail(user.email, verificationToken);

                        return NextResponse.json({
                            success: false,
                            requiresEmailVerification: true,
                            message: 'Please verify your email address first. A verification link has been sent to your email.',
                            email: user.email,
                            user: {
                                id: user._id.toString(),
                                email: user.email,
                                name: user.name,
                                isEmailVerified: false
                            },
                            simulatedEmail: verificationResult.simulated || false
                        }, { headers });
                    }

                    // Email is verified, send OTP for login
                    const loginOTP = generateOTP();

                    const otpId = await storeOTP(otpCollection, {
                        identifier: loginEmail.toLowerCase(),
                        otp: loginOTP,
                        type: 'login-otp',
                        userId: user._id.toString(),
                        userEmail: user.email,
                        userName: user.name,
                        purpose: 'login'
                    });

                    const otpResult = await sendOTPEmail(user.email, loginOTP);

                    if (!otpResult.success && !otpResult.simulated) {
                        await otpCollection.deleteOne({ _id: new ObjectId(otpId) });
                        return NextResponse.json({
                            success: false,
                            error: 'Failed to send OTP'
                        }, { status: 500, headers });
                    }

                    return NextResponse.json({
                        success: true,
                        message: 'OTP sent to your email',
                        email: user.email,
                        otpId: otpId,
                        requiresOTP: true,
                        simulatedEmail: otpResult.simulated || false,
                        otp: otpResult.otp,
                        user: {
                            id: user._id.toString(),
                            email: user.email,
                            name: user.name,
                            isEmailVerified: true
                        }
                    }, { headers });

                } catch (error) {
                    console.error('Send login OTP error:', error);
                    return NextResponse.json({
                        success: false,
                        error: 'Error sending OTP'
                    }, { status: 500, headers });
                }
            }

            // ========== VERIFY LOGIN OTP ==========
            case 'verify-login-otp': {
                console.log('Verifying login OTP...');
                const { email: verifyEmail, otp: verifyOtp, rememberMe = false } = body;

                if (!verifyEmail || !verifyOtp) {
                    return NextResponse.json({
                        success: false,
                        error: 'Email and OTP are required'
                    }, { status: 400, headers });
                }

                try {
                    const otpRecord = await getOTP(
                        otpCollection,
                        verifyEmail.toLowerCase(),
                        verifyOtp,
                        'login-otp'
                    );

                    if (!otpRecord) {
                        return NextResponse.json({
                            success: false,
                            error: 'Invalid or expired OTP'
                        }, { status: 400, headers });
                    }

                    if (otpRecord.otp !== verifyOtp) {
                        await updateOTPAttempts(otpCollection, otpRecord._id.toString());
                        return NextResponse.json({
                            success: false,
                            error: 'Invalid OTP'
                        }, { status: 400, headers });
                    }

                    await updateOTPAttempts(otpCollection, otpRecord._id.toString(), false);

                    const user = await usersCollection.findOne({
                        _id: new ObjectId(otpRecord.userId)
                    });

                    if (!user) {
                        return NextResponse.json({
                            success: false,
                            error: 'User not found'
                        }, { status: 404, headers });
                    }

                    const token = await createToken({
                        id: user._id.toString(),
                        email: user.email,
                        name: user.name,
                        role: user.role
                    }, rememberMe ? '30d' : '7d');

                    await usersCollection.updateOne(
                        { _id: user._id },
                        { $set: { lastLogin: new Date(), updatedAt: new Date() } }
                    );

                    return NextResponse.json({
                        success: true,
                        message: 'Login successful',
                        token: token,
                        user: {
                            id: user._id.toString(),
                            email: user.email,
                            name: user.name,
                            phone: user.phone,
                            role: user.role,
                            isEmailVerified: user.isEmailVerified
                        }
                    }, { headers });

                } catch (error) {
                    console.error('Verify login OTP error:', error);
                    return NextResponse.json({
                        success: false,
                        error: 'Error verifying OTP'
                    }, { status: 500, headers });
                }
            }

            // ========== VERIFY EMAIL LINK ==========
            case 'verify-email-link': {
                console.log('Verifying email link...');
                const { token: verificationToken, email: tokenEmail } = body;

                if (!verificationToken) {
                    return NextResponse.json({
                        success: false,
                        error: 'Verification token is required'
                    }, { status: 400, headers });
                }

                try {
                    const tokenRecord = await getVerificationToken(
                        otpCollection,
                        verificationToken,
                        'email-verification'
                    );

                    if (!tokenRecord) {
                        return NextResponse.json({
                            success: false,
                            error: 'Invalid or expired verification link'
                        }, { status: 400, headers });
                    }

                    const user = await usersCollection.findOne({
                        _id: new ObjectId(tokenRecord.userId)
                    });

                    if (!user) {
                        return NextResponse.json({
                            success: false,
                            error: 'User not found'
                        }, { status: 404, headers });
                    }

                    if (user.isEmailVerified) {
                        return NextResponse.json({
                            success: true,
                            message: 'Email already verified',
                            alreadyVerified: true
                        }, { headers });
                    }

                    // Mark email as verified
                    await usersCollection.updateOne(
                        { _id: user._id },
                        { $set: { isEmailVerified: true, emailVerifiedAt: new Date(), updatedAt: new Date() } }
                    );

                    // Mark token as verified
                    await otpCollection.updateOne(
                        { _id: tokenRecord._id },
                        { $set: { isVerified: true, verifiedAt: new Date() } }
                    );

                    return NextResponse.json({
                        success: true,
                        message: 'Email verified successfully! You can now login.',
                        user: {
                            id: user._id.toString(),
                            email: user.email,
                            name: user.name,
                            isEmailVerified: true
                        }
                    }, { headers });

                } catch (error) {
                    console.error('Verify email link error:', error);
                    return NextResponse.json({
                        success: false,
                        error: 'Error verifying email'
                    }, { status: 500, headers });
                }
            }

            // ========== RESEND VERIFICATION EMAIL ==========
            case 'resend-verification': {
                console.log('Resending verification email...');
                const { email: resendEmail } = body;

                if (!resendEmail) {
                    return NextResponse.json({
                        success: false,
                        error: 'Email is required'
                    }, { status: 400, headers });
                }

                try {
                    const user = await usersCollection.findOne({
                        email: resendEmail.toLowerCase()
                    });

                    if (!user) {
                        return NextResponse.json({
                            success: false,
                            error: 'User not found'
                        }, { status: 404, headers });
                    }

                    if (user.isEmailVerified) {
                        return NextResponse.json({
                            success: false,
                            error: 'Email already verified',
                            alreadyVerified: true
                        }, { status: 400, headers });
                    }

                    // Check rate limiting
                    const recentToken = await otpCollection.findOne({
                        userEmail: resendEmail.toLowerCase(),
                        type: 'email-verification',
                        createdAt: { $gt: new Date(Date.now() - 300000) }
                    });

                    if (recentToken) {
                        return NextResponse.json({
                            success: false,
                            error: 'Please wait 5 minutes before requesting another verification email'
                        }, { status: 429, headers });
                    }

                    const newToken = generateVerificationToken();

                    await storeVerificationToken(otpCollection, {
                        identifier: newToken,
                        type: 'email-verification',
                        userId: user._id.toString(),
                        userEmail: user.email,
                        userName: user.name,
                        purpose: 'verify-email'
                    });

                    const emailResult = await sendVerificationEmail(user.email, newToken);

                    if (!emailResult.success && !emailResult.simulated) {
                        return NextResponse.json({
                            success: false,
                            error: 'Failed to send verification email'
                        }, { status: 500, headers });
                    }

                    return NextResponse.json({
                        success: true,
                        message: 'Verification email sent successfully',
                        simulatedEmail: emailResult.simulated || false
                    }, { headers });

                } catch (error) {
                    console.error('Resend verification error:', error);
                    return NextResponse.json({
                        success: false,
                        error: 'Error resending verification email'
                    }, { status: 500, headers });
                }
            }

            // ========== CHECK USER ==========
            case 'check-user': {
                console.log('Checking user...');
                const { identifier, type = 'email' } = body;

                let checkQuery = {};
                if (type === 'email') {
                    if (!identifier) {
                        return NextResponse.json({
                            success: false,
                            error: 'Email is required'
                        }, { status: 400, headers });
                    }
                    checkQuery.email = identifier.toLowerCase();
                } else if (type === 'phone') {
                    if (!identifier) {
                        return NextResponse.json({
                            success: false,
                            error: 'Phone is required'
                        }, { status: 400, headers });
                    }
                    const formattedPhone = formatPhoneNumber(identifier);
                    if (!formattedPhone) {
                        return NextResponse.json({
                            success: false,
                            error: 'Invalid phone number'
                        }, { status: 400, headers });
                    }
                    checkQuery.phone = formattedPhone;
                }

                try {
                    const existingUser = await usersCollection.findOne(checkQuery);
                    return NextResponse.json({
                        success: true,
                        exists: !!existingUser,
                        user: existingUser ? {
                            id: existingUser._id.toString(),
                            email: existingUser.email,
                            phone: existingUser.phone,
                            name: existingUser.name,
                            isEmailVerified: existingUser.isEmailVerified || false
                        } : null
                    }, { headers });
                } catch (dbError) {
                    console.error('Database query error:', dbError);
                    return NextResponse.json({
                        success: false,
                        error: 'Database error checking user'
                    }, { status: 500, headers });
                }
            }

            // ========== REGISTER USER ==========
            case 'register': {
                console.log('Processing registration...');
                const { name, email, phone, password } = body;

                // Basic validation
                if (!name || !email || !phone || !password) {
                    return NextResponse.json({
                        success: false,
                        error: 'All fields are required'
                    }, { status: 400, headers });
                }

                if (!isValidEmail(email)) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid email format'
                    }, { status: 400, headers });
                }

                if (!isValidPhone(phone)) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid phone number'
                    }, { status: 400, headers });
                }

                if (password.length < 6) {
                    return NextResponse.json({
                        success: false,
                        error: 'Password must be at least 6 characters'
                    }, { status: 400, headers });
                }

                const formattedPhoneReg = formatPhoneNumber(phone);
                if (!formattedPhoneReg) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid phone number format'
                    }, { status: 400, headers });
                }

                // Check if user exists
                const existingEmail = await usersCollection.findOne({
                    email: email.toLowerCase()
                });
                if (existingEmail) {
                    return NextResponse.json({
                        success: false,
                        error: 'Email already registered'
                    }, { status: 400, headers });
                }

                const existingPhone = await usersCollection.findOne({
                    phone: formattedPhoneReg
                });
                if (existingPhone) {
                    return NextResponse.json({
                        success: false,
                        error: 'Phone number already registered'
                    }, { status: 400, headers });
                }

                const hashedPassword = await bcrypt.hash(password, 10);
                const verificationToken = generateVerificationToken();

                const newUser = {
                    name,
                    email: email.toLowerCase(),
                    phone: formattedPhoneReg,
                    password: hashedPassword,
                    role: 'user',
                    isEmailVerified: false,
                    isPhoneVerified: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = await usersCollection.insertOne(newUser);
                const userId = result.insertedId.toString();

                // Store verification token
                await storeVerificationToken(otpCollection, {
                    identifier: verificationToken,
                    type: 'email-verification',
                    userId: userId,
                    userEmail: email.toLowerCase(),
                    userName: name,
                    purpose: 'verify-email'
                });

                // Send verification email
                const emailResult = await sendVerificationEmail(email, verificationToken);

                return NextResponse.json({
                    success: true,
                    message: 'Registration successful! Please check your email to verify your account.',
                    requiresEmailVerification: true,
                    userId: userId,
                    user: {
                        id: userId,
                        email: email.toLowerCase(),
                        name: name,
                        isEmailVerified: false
                    },
                    simulatedEmail: emailResult.simulated || false
                }, { headers });
            }

            // ========== SEND PHONE OTP ==========
            case 'send-phone-otp': {
                console.log('Sending phone OTP...');
                const { phone: phoneForOTP } = body;

                if (!phoneForOTP) {
                    return NextResponse.json({
                        success: false,
                        error: 'Phone number is required'
                    }, { status: 400, headers });
                }

                const cleanedPhone = phoneForOTP.replace(/\D/g, '');
                if (!isValidPhone(cleanedPhone)) {
                    return NextResponse.json({
                        success: false,
                        error: 'Please enter a valid 10-digit phone number'
                    }, { status: 400, headers });
                }

                const fullPhoneNumber = formatPhoneNumber(cleanedPhone);
                const phoneOTP = generateOTP();

                const phoneOTPId = await storeOTP(otpCollection, {
                    identifier: fullPhoneNumber,
                    otp: phoneOTP,
                    type: 'phone-otp',
                    purpose: 'phone-verification'
                });

                const smsResult = await sendSMS(cleanedPhone, phoneOTP);

                return NextResponse.json({
                    success: true,
                    message: 'OTP sent to your phone',
                    phone: fullPhoneNumber,
                    otpId: phoneOTPId,
                    simulatedSMS: smsResult.simulated || false,
                    otp: smsResult.otp
                }, { headers });
            }

            // ========== VERIFY PHONE OTP ==========
            case 'verify-phone-otp': {
                console.log('Verifying phone OTP...');
                const { phone: verifyPhone, otp: phoneOtp, userName } = body;

                if (!verifyPhone || !phoneOtp) {
                    return NextResponse.json({
                        success: false,
                        error: 'Phone and OTP are required'
                    }, { status: 400, headers });
                }

                const formattedPhoneVerify = formatPhoneNumber(verifyPhone);
                const otpRecord = await getOTP(
                    otpCollection,
                    formattedPhoneVerify,
                    phoneOtp,
                    'phone-otp'
                );

                if (!otpRecord) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid or expired OTP'
                    }, { status: 400, headers });
                }

                await updateOTPAttempts(otpCollection, otpRecord._id.toString(), false);

                let user = await usersCollection.findOne({
                    phone: formattedPhoneVerify
                });

                let isNewUser = false;

                if (!user) {
                    const newUser = {
                        name: userName,
                        phone: formattedPhoneVerify,
                        email: body.email || '',
                        role: 'user',
                        isEmailVerified: !!body.email,
                        isPhoneVerified: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    const result = await usersCollection.insertOne(newUser);
                    user = { ...newUser, _id: result.insertedId };
                    isNewUser = true;
                }

                const token = await createToken({
                    id: user._id.toString(),
                    phone: user.phone,
                    email: user.email,
                    name: user.name,
                    role: user.role
                });

                return NextResponse.json({
                    success: true,
                    message: isNewUser ? 'Account created successfully!' : 'Login successful!',
                    token: token,
                    user: {
                        id: user._id.toString(),
                        phone: user.phone,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        isEmailVerified: user.isEmailVerified || false
                    },
                    isNewUser: isNewUser
                }, { headers });
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
            error: 'Internal server error. Please try again later.'
        }, { status: 500, headers });
    }
}