const { z } = require('zod');

const CreateFormSchema = z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    questions: z.array(
        z.object({
            question_text: z.string().min(2),
            question_type: z.enum(['text', 'email', 'number', 'date', 'checkbox', 'url']),
            is_required: z.boolean().optional().default(true),
            order_index: z.number().int(),
            options: z
                .array(
                    z.object({
                        option_text: z.string(),
                        order_index: z.number().int(),
                    })
                )
                .optional()
        })
    ),
});

const PatchFormSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    is_public: z.boolean().optional(),
    closed: z.boolean().optional(),
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided" }
);


const PatchQuestionSchema = z.object({
    question_text: z.string().min(1).optional(),
    is_required: z.boolean().optional(),
    order_index: z.number().int().optional(),
    options: z.array(
        z.object({
            id: z.string().uuid().optional(), // Made optional to allow new options
            option_text: z.string().min(1),
            order_index: z.number().int()
        })
    ).optional()
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided to update a question" }
);

module.exports = {
    CreateFormSchema,
    PatchFormSchema,
    PatchQuestionSchema
}