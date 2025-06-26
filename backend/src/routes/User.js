const Router = require("express");
const bcrypt = require("bcryptjs");
const { CreateUserSchema, LoginUserSchema } = require("../schema/user.schema");
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../libs/connectDb");
const { createToken } = require("../utils/jwt");
const router = Router();

router.post("/create", async (req, res) => {
    try {
        const parsed = CreateUserSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid input",
                errors: parsed.error.errors
            });
        }

        const { name, email, password } = parsed.data;
        const client = await db.Client();
        const existingUser = await client.query("SELECT * FROM users WHERE email = $1", [email]);

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "User already exists", success: false });
        }

        const hashedpassword = await bcrypt.hash(password, 10);
        const resp = await client.query("INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *", [name, email, hashedpassword]);
        if (resp.rows.length === 0) {
            return res.status(400).json({ message: "User creation failed", success: false });
        }
        const user = resp.rows[0];
        user.password = undefined;
        const token = createToken({ id: user.id, email: user.email, name: user.name, is_verified: user.is_verified });
        res.status(201).json({ message: "User created successfully", user, success: true, token });
    } catch (error) {
        console.log("Error creating user:", error);
        res.status(500).json({ message: "Internal server error", error: "Internal server error", success: false });
    }
})

router.post("/login", async (req, res) => {
    try {
        const parsed = LoginUserSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid input",
                errors: parsed.error.errors
            });
        }
        const { email, password } = parsed.data;
        const client = await db.Client();
        const resp = await client.query("SELECT email,password,id,name,is_verified FROM users WHERE email = $1", [email]);

        if (resp.rows.length === 0) {
            return res.status(400).json({ message: "User not found", success: false });
        }
        const comparePassword = await bcrypt.compare(password, resp.rows[0].password);
        if (!comparePassword) {
            return res.status(400).json({ message: "Invalid credentials", success: false });
        }
        const user = resp.rows[0];
        user.password = undefined;
        const token = createToken({ id: user.id, email: user.email, name: user.name });
        res.status(200).json({ message: "User logged in successfully", user, success: true, token });
    } catch (error) {
        console.log("Error  login user:", error);
        res.status(500).json({ message: "Internal server error", error: "Internal server error", success: false });
    }
})

router.use(authMiddleware);

router.get("/", async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required", success: false });
        }
        const client = await db.Client();
        const resp = await client.query("SELECT id, name, email, is_verified FROM users WHERE id = $1", [userId]);
        if (resp.rows.length === 0) {
            return res.status(404).json({ message: "User not found", success: false });
        }
        const user = resp.rows[0];
        return res.status(200).json({ message: "User fetched successfully", user, success: true });
    } catch (error) {
        console.log("Error fetching user:", error);
        res.status(500).json({ message: "Internal server error", error: "Internal server error", success: false });
    }
})

module.exports = router;