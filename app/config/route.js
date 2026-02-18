import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const apiConfig = async (req, res) => {
    if (req.method === 'GET') {
        // Handle GET request
        const data = await clientPromise();
        res.status(200).json(data);
    } else if (req.method === 'POST') {
        // Handle POST request
        const schema = Joi.object({
            username: Joi.string().min(3).required(),
            password: Joi.string().min(6).required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const hashedPassword = await bcrypt.hash(value.password, 10);
        // Save user to the database logic here

        res.status(201).json({ message: 'User created successfully' });
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default apiConfig;