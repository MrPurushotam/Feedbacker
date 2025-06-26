const Router = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { PatchQuestionSchema } = require("../schema/form.schema");
const db = require("../libs/connectDb");
const router = Router();


router.use(authMiddleware);

router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const parsed = PatchQuestionSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid input",
            errors: parsed.error.errors
        });
    }
    const { question_text, is_required, order_index, options } = parsed.data;

    const client = await db.Client();
    try {
        await client.query('BEGIN');

        const ownershipCheck = await client.query(
            `SELECT q.*, f.user_id 
             FROM questions q 
             JOIN forms f ON q.form_id = f.id 
             WHERE q.id = $1`,
            [id]
        );

        if (ownershipCheck.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Question not found", success: false });
        }

        if (ownershipCheck.rows[0].user_id !== userId) {
            await client.query("ROLLBACK");
            return res.status(403).json({ message: "Unauthorized to modify this question", success: false });
        }

        const questionResult = await client.query(
            `UPDATE questions
             SET question_text = COALESCE($1, question_text),
                 is_required = COALESCE($2, is_required),
                 order_index = COALESCE($3, order_index),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [question_text, is_required, order_index, id]
        );
        if (questionResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Failed to update question", success: false });
        }
        const question = questionResult.rows[0];

        if (question.question_type === "checkbox" && Array.isArray(options)) {
            const existingOptionsRes = await client.query(
                `SELECT id FROM options WHERE question_id = $1`,
                [id]
            );

            const existingOptionIds = existingOptionsRes.rows.map(opt => opt.id);
            const incomingOptionIds = options.filter(opt => opt.id).map(opt => opt.id);

            for (const opt of options) {
                if (opt.id && existingOptionIds.includes(opt.id)) {
                    await client.query(
                        `UPDATE options
                         SET option_text = $1, order_index = $2
                         WHERE id = $3`,
                        [opt.option_text, opt.order_index, opt.id]
                    );
                }
            }

            for (const opt of options) {
                if (!opt.id) {
                    await client.query(
                        `INSERT INTO options (question_id, option_text, order_index)
                         VALUES ($1, $2, $3)`,
                        [id, opt.option_text, opt.order_index]
                    );
                }
            }

            const toDelete = existingOptionIds.filter(existingId => !incomingOptionIds.includes(existingId));
            for (const delId of toDelete) {
                await client.query(`DELETE FROM options WHERE id = $1`, [delId]);
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ message: "Question updated", success: true });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error updating question:", err);
        res.status(500).json({ message: "Internal server error", success: false });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.userId;

        if (!id) {
            return res.status(400).json({ message: "Question ID is required", success: false });
        }

        const client = await db.Connect();
        await client.query('BEGIN');

        const ownershipCheck = await client.query(
            `SELECT q.form_id, f.user_id 
             FROM questions q 
             JOIN forms f ON q.form_id = f.id 
             WHERE q.id = $1`,
            [id]
        );

        if (ownershipCheck.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Question not found", success: false });
        }

        if (ownershipCheck.rows[0].user_id !== userId) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: "Unauthorized to delete this question", success: false });
        }

        const form_id = ownershipCheck.rows[0].form_id;
        const deleteResult = await client.query("DELETE FROM questions WHERE id = $1", [id]);

        if (deleteResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Question not found", success: false });
        }
        const remainingQuestions = await client.query(
            "SELECT COUNT(*) FROM questions WHERE form_id = $1",
            [form_id]
        );

        if (remainingQuestions.rows[0].count === "0") {
            await client.query(
                "UPDATE forms SET closed = true WHERE id = $1",
                [form_id]
            );
        }

        await client.query('COMMIT');
        res.status(200).json({ message: "Question deleted successfully", success: true });

    } catch (error) {
        console.error("Error deleting question:", error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
});


module.exports = router;
