const Router = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { SubmitResponseSchema } = require("../schema/response.schema");
const db = require("../libs/connectDb");
const router = Router();

// handle upload response, fetch all response list


// Its to sophisticated

router.post("/:form_id", async (req, res) => {
    const { form_id } = req.params;
    const parsed = SubmitResponseSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid answers",
            errors: parsed.error.errors,
            success: false
        });
    }

    const { answers } = parsed.data;
    const client = await db.Client();

    try {
        await client.query("BEGIN");
        const formCheck = await client.query(
            `SELECT id, closed,is_public FROM forms WHERE id = $1`,
            [form_id]
        );

        if (formCheck.rowCount === 0 || !formCheck.rows[0].is_public) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Form not found", success: false });
        }

        if (formCheck.rows[0].closed) {
            await client.query("ROLLBACK");
            return res.status(403).json({ message: "Form is closed", success: false });
        }

        const questionsResult = await client.query(
            `SELECT id, is_required FROM questions WHERE form_id = $1`,
            [form_id]
        );
        const questionMap = new Map(questionsResult.rows.map(q => [q.id, q]));

        for (const [questionId, question] of questionMap.entries()) {
            if (question.is_required) {
                const found = answers.find(a => a.question_id === questionId);
                if (
                    !found ||
                    (found.answer_text === undefined || found.answer_text === null) &&
                    (found.option_id === undefined || found.option_id === null)
                ) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({
                        message: `Required question (${questionId}) is missing or incomplete.`,
                        success: false
                    });
                }
            }
        }
        for (const answer of answers) {
            if (!questionMap.has(answer.question_id)) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    message: `Question ${answer.question_id} does not exist in this form.`,
                    success: false
                });
            }

            if (
                (answer.answer_text === undefined || answer.answer_text === null || answer.answer_text.trim() === "") &&
                (answer.option_id === undefined || answer.option_id === null)
            ) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    message: `Each answer must have at least answer_text or option_id.`,
                    success: false
                });
            }
        }

        const responseResult = await client.query(
            `INSERT INTO responses (form_id) VALUES ($1) RETURNING id`,
            [form_id]
        );
        const response_id = responseResult.rows[0].id;
        for (const answer of answers) {
            await client.query(
                `INSERT INTO answers (response_id, question_id, answer_text, option_id)
                 VALUES ($1, $2, $3, $4)`,
                [
                    response_id,
                    answer.question_id,
                    answer.answer_text || null,
                    answer.option_id || null
                ]
            );
        }

        await client.query("COMMIT");
        return res.status(201).json({
            message: "Response submitted successfully",
            success: true,
            response_id
        });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error submitting response:", err);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
});

router.use(authMiddleware);

router.get("/all/:form_id", async (req, res) => {
    const { form_id } = req.params;
    const page = parseInt(req.query?.page) || 1;
    const limit = parseInt(req.query?.limit) || 20;
    const offset = (page - 1) * limit;

    const client = await db.Client();

    try {
        const formCheck = await client.query(
            `SELECT id FROM forms WHERE id = $1 AND user_id = $2`,
            [form_id, req.userId]
        );

        if (formCheck.rowCount === 0) {
            return res.status(404).json({ message: "Form not found or access denied", success: false });
        }

        // Get total count for pagination
        const countResult = await client.query(
            `SELECT COUNT(*) as total FROM responses WHERE form_id = $1`,
            [form_id]    
        );
        const totalCount = parseInt(countResult.rows[0].total);

        const responsesResult = await client.query(
            `SELECT id, created_at FROM responses
             WHERE form_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [form_id, limit, offset]
        );

        const responses = responsesResult.rows;

        if (responses.length === 0) {
            return res.status(200).json({ 
                message: "No responses yet", 
                responses: [], 
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                },
                success: true 
            });
        }
        const responseIds = responses.map(r => r.id);
        const answersResult = await client.query(
            `SELECT a.response_id, a.question_id, a.answer_text, a.option_id, o.option_text
             FROM answers a
             LEFT JOIN options o ON a.option_id = o.id
             WHERE a.response_id = ANY($1::uuid[])`,
            [responseIds]
        );
        const responseMap = new Map();

        for (const response of responses) {
            responseMap.set(response.id, {
                id: response.id,
                created_at: response.created_at,
                answers: []
            });
        }

        for (const answer of answersResult.rows) {
            const resObj = responseMap.get(answer.response_id);
            if (resObj) {
                resObj.answers.push({
                    question_id: answer.question_id,
                    answer_text: answer.answer_text,
                    option_id: answer.option_id,
                    option_text: answer.option_text || null
                });
            }
        }

        const responseList = Array.from(responseMap.values());
        return res.status(200).json({
            message: "Responses fetched",
            responses: responseList,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                count: responseList.length
            },
            success: true
        });

    } catch (err) {
        console.error("Error fetching responses:", err);
        res.status(500).json({ message: "Internal server error", success: false });
    }
});

module.exports = router