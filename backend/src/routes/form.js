const Router = require("express");
const router = Router();
const db = require("../libs/connectDb");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalMiddleware");
const { CreateFormSchema, PatchFormSchema } = require("../schema/form.schema");

router.get("/all", authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const client = await db.Client();

        const resp = await client.query(`
            SELECT f.id, f.title, f.description, f.created_at, f.closed, 
                   COUNT(r.id) AS response_count
            FROM forms f
            LEFT JOIN responses r ON f.id = r.form_id
            WHERE f.user_id = $1
            GROUP BY f.id
            ORDER BY f.created_at DESC
        `, [userId]);

        if (resp.rows.length === 0) {
            return res.status(404).json({ message: "No forms found", success: false });
        }
        const forms = resp.rows.map(form => ({
            ...form,
            response_count: parseInt(form.response_count)
        }));

        return res.status(200).json({ message: "Forms fetched successfully", forms, success: true });

    } catch (error) {
        console.log("Error fetching forms:", error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
});

router.get("/:id", optionalAuthMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const client = await db.Connect();
        if (!id) {
            return res.status(400).json({ message: "Form ID is required", success: false });
        }
        const resp = await client.query("SELECT * FROM forms WHERE id = $1", [id]);
        if (resp.rows.length === 0) {
            return res.status(404).json({ message: "Form not found", success: false });
        }
        const form = resp.rows[0];
        if (form.closed) {
            return res.status(200).json({ message: "Form is closed", success: true })
        }
        if (!form.is_public || form.is_public === false) {
            const userId = req.userId;
            if (!userId || userId !== form.user_id) {
                return res.status(200).json({ message: "Form not found", success: true });
            }
        }
        const questionsResult = await client.query("SELECT * from questions WHERE form_id = $1 ORDER BY order_index ASC", [form.id]);

        const questions = questionsResult.rows;
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            delete q.updated_at;
            if (q.question_type === "checkbox") {
                const optionsResult = await client.query(
                    "SELECT id,option_text, order_index FROM options WHERE question_id = $1 ORDER BY order_index ASC",
                    [q.id]
                );
                q.options = optionsResult.rows;
            } else {
                q.options = [];
            }
        }
        return res.status(200).json({
            message: "Form fetched successfully",
            form: {
                id: form.id,
                title: form.title,
                description: form.description,
                is_public: form.is_public,
                created_at: form.created_at,
                questions,
            },
            success: true
        });
    } catch (error) {
        console.log("Error fetching form:", error);
        res.status(500).json({ message: "Internal server error", error: "Internal server error", success: false });
    }
})

router.use(authMiddleware);

router.post("/create", async (req, res) => {
    try {
        const client = await db.Connect();
        const parsed = CreateFormSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors, success: false });
        }
        const { title, description, questions } = parsed.data;
        const user_id = req.userId; // Fixed: using req.userId

        await client.query('BEGIN');

        const formResult = await client.query(
            `INSERT INTO forms (user_id, title, description) VALUES ($1, $2, $3) RETURNING id`,
            [user_id, title, description]
        );
        const form_id = formResult.rows[0].id;

        for (const q of questions) {
            const questionResult = await client.query(
                `INSERT INTO questions ( form_id, question_text, question_type, is_required, order_index) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [form_id, q.question_text, q.question_type, q.is_required ?? true, q.order_index]
            );
            const question_id = questionResult.rows[0].id;

            if (q.question_type === "checkbox" && q.options && Array.isArray(q.options)) {
                for (const option of q.options) {
                    await client.query(
                        `INSERT INTO options (question_id, option_text, order_index) VALUES ($1, $2, $3)`,
                        [question_id, option.option_text, option.order_index]
                    );
                }
            }
        }
        await client.query('COMMIT');

        return res.status(201).json({ success: true, form_id, message: "Form created successfully" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.log("Error creating form:", error);
        res.status(500).json({ message: "Internal server error", error: "Internal server error", success: false });
    }
});

router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const parsed = PatchFormSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid input",
            errors: parsed.error.errors
        });
    }
    const { title, description, is_public, closed } = parsed.data;

    if (!id) return res.status(400).json({ message: "Form ID required", success: false });
    try {
        const client = await db.Connect();
        const result = await client.query(
            `UPDATE forms 
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 is_public = COALESCE($3, is_public),
                 closed = COALESCE($4, closed),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 AND user_id = $6
             RETURNING *`,
            [title, description, is_public, closed, id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Form not found", success: false });
        }

        return res.status(200).json({ message: "Form updated", form: result.rows[0], success: true });
    } catch (err) {
        console.error("Error updating form:", err);
        res.status(500).json({ message: "Internal server error", success: false });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.userId;
        if (!id) {
            return res.status(400).json({ message: "Form ID is required", success: false });
        }
        const client = await db.Connect();
        const resp = await client.query("DELETE FROM forms WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId]);
        if (resp.rows.length === 0) {
            return res.status(404).json({ message: "Form not found", success: false });
        }
        return res.status(200).json({ message: "Form deleted successfully", success: true });
    } catch (error) {
        console.log("Error deleting form:", error);
        res.status(500).json({ message: "Internal server error", error: "Internal server error", success: false });
    }
})

router.get("/detail/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.userId;
        if (!id) {
            return res.status(404).json({ message: "Form ID is required", success: false });
        }
        const client = await db.Client();
        const resp = await client.query("SELECT * FROM forms WHERE id = $1 AND user_id = $2", [id,userId]);
        if (resp.rows.length === 0) {
            return res.status(404).json({ message: "Form not found", success: false });
        }
        const form = resp.rows[0];

        const questionsResult = await client.query("SELECT * from questions WHERE form_id = $1 ORDER BY order_index ASC", [id]);

        const questions = questionsResult.rows;
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (q.question_type === "checkbox") {
                const optionsResult = await client.query(
                    "SELECT id,option_text, order_index FROM options WHERE question_id = $1 ORDER BY order_index ASC",
                    [q.id]
                );
                q.options = optionsResult.rows;
            } else {
                q.options = [];
            }
        }
        return res.status(200).json({
            message: "Form fetched successfully",
            form: {
                id: form.id,
                title: form.title,
                description: form.description,
                is_public: form.is_public,
                closed: form.closed,
                created_at: form.created_at,
                questions,
            },
            success: true
        });

    } catch (error) {
        console.log("Error fetching form details", error);
        res.status(500).json({ message: "Internal server error", error: "Internal server error", success: false })
    }
})

module.exports = router;