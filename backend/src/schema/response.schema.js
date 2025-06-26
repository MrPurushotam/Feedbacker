const { z } = require('zod');

const AnswerSchema = z.object({
    question_id: z.string().uuid(),
    answer_text: z.string().optional().nullable(),
    option_id: z.string().uuid().optional().nullable()
});

const SubmitResponseSchema = z.object({
    answers: z.array(AnswerSchema).min(1)
});


module.exports = {
    SubmitResponseSchema,
    AnswerSchema
}
