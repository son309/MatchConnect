import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

export const getAuthCookieOptions = () => {
    const isProduction = ENV.NODE_ENV === "production";

    return {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
    };
};

export const generateToken = (userId, res) => {
    const { JWT_SECRET } = ENV;
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");

    const token = jwt.sign({ userId }, JWT_SECRET, {
        expiresIn: "7d",
    });

    res.cookie("jwt", token, {
        ...getAuthCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return token;
};