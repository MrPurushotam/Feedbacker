import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../libs/api';
import Navbar from '../components/navbar';

const QUESTION_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'checkbox', label: 'Multiple Choice' },
    { value: 'url', label: 'URL' }
];

const EditForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    // Current form data
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        is_public: false,
        closed: false,
        questions: [
            {
                question_text: '',
                question_type: 'text',
                is_required: true,
                order_index: 0,
                options: []
            }
        ]
    });

    const [initialFormData, setInitialFormData] = useState(null);
    const [errors, setErrors] = useState({});
    const [saveLoading, setSaveLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        fetchUserData();
        if (isEditMode) {
            fetchFormData();
        }
    }, [id, isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps


    const fetchUserData = async () => {
        try {
            const response = await api.get('/user/');
            if (response.data.success) {
                setUser(response.data.user);
            } else {
                alert('Failed to fetch user data: ' + response.data.message);
                navigate('/dashboard');
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    const fetchFormData = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/feedback/detail/${id}`);
            if (response.data.success) {
                const form = response.data.form;
                const formDataStructure = {
                    title: form.title,
                    description: form.description,
                    is_public: form.is_public || false,
                    closed: form.closed || false,
                    questions: form.questions?.length > 0 ? form.questions.map((q, index) => ({
                        id: q.id, // Keep question ID for edit operations
                        question_text: q.question_text,
                        question_type: q.question_type,
                        is_required: q.is_required ?? true,
                        order_index: index,
                        options: q.options?.map((opt, optIndex) => ({
                            id: opt.id,
                            option_text: opt.option_text,
                            order_index: optIndex
                        })) || []
                    })) : [
                        {
                            question_text: '',
                            question_type: 'text',
                            is_required: true,
                            order_index: 0,
                            options: []
                        }
                    ]
                };

                setFormData(formDataStructure);
                setInitialFormData(JSON.parse(JSON.stringify(formDataStructure)));
            } else {
                alert('Failed to fetch form data: ' + response.data.message);
                navigate('/dashboard');
            }
        } catch (error) {
            console.error('Error fetching form:', error);
            alert('Failed to load form data');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const hasFormChanges = useCallback(() => {
        if (!initialFormData) return false;
        if (formData.title !== initialFormData.title ||
            formData.description !== initialFormData.description ||
            formData.is_public !== initialFormData.is_public ||
            formData.closed !== initialFormData.closed) {
            return true;
        }

        if (formData.questions.length !== initialFormData.questions.length) {
            return true;
        }

        for (let i = 0; i < formData.questions.length; i++) {
            const current = formData.questions[i];
            const initial = initialFormData.questions[i];

            if (!initial) return true;

            if (current.question_text !== initial.question_text ||
                current.question_type !== initial.question_type ||
                current.is_required !== initial.is_required) {
                return true;
            }
            if (current.options.length !== initial.options.length) {
                return true;
            }

            for (let j = 0; j < current.options.length; j++) {
                const currentOpt = current.options[j];
                const initialOpt = initial.options[j];

                if (!initialOpt || currentOpt.option_text !== initialOpt.option_text) {
                    return true;
                }
            }
        }

        return false;
    }, [formData, initialFormData]);

    useEffect(() => {
        if (isEditMode && initialFormData) {
            const changes = hasFormChanges();
            setHasChanges(changes);
        }
    }, [formData, initialFormData, isEditMode, hasFormChanges]);


    const handleFormChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handleQuestionChange = (questionIndex, field, value) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.map((q, index) =>
                index === questionIndex
                    ? {
                        ...q,
                        [field]: value,
                        ...(field === 'question_type' && value !== 'checkbox' ? { options: [] } : {})
                    }
                    : q
            )
        }));
    };

    const handleOptionChange = (questionIndex, optionIndex, value) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.map((q, qIndex) =>
                qIndex === questionIndex
                    ? {
                        ...q,
                        options: q.options.map((opt, oIndex) =>
                            oIndex === optionIndex
                                ? { ...opt, option_text: value }
                                : opt
                        )
                    }
                    : q
            )
        }));
    };

    const addQuestion = () => {
        setFormData(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    question_text: '',
                    question_type: 'text',
                    is_required: true,
                    order_index: prev.questions.length,
                    options: []
                }
            ]
        }));
    };

    const removeQuestion = async (questionIndex) => {
        if (formData.questions.length <= 1) return;

        const question = formData.questions[questionIndex];

        // If this is an existing question (has ID), delete it from backend
        if (isEditMode && question.id) {
            try {
                const response = await api.delete(`/question/${question.id}`);
                if (!response.data.success) {
                    alert('Failed to delete question: ' + response.data.message);
                    return;
                }
            } catch (error) {
                console.error('Error deleting question:', error);
                alert('Failed to delete question');
                return;
            }
        }

        setFormData(prev => ({
            ...prev,
            questions: prev.questions
                .filter((_, index) => index !== questionIndex)
                .map((q, index) => ({ ...q, order_index: index }))
        }));
    };

    const addOption = (questionIndex) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.map((q, index) =>
                index === questionIndex
                    ? {
                        ...q,
                        options: [
                            ...q.options,
                            {
                                option_text: '',
                                order_index: q.options.length
                            }
                        ]
                    }
                    : q
            )
        }));
    };

    const removeOption = (questionIndex, optionIndex) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.map((q, qIndex) =>
                qIndex === questionIndex
                    ? {
                        ...q,
                        options: q.options
                            .filter((_, oIndex) => oIndex !== optionIndex)
                            .map((opt, index) => ({ ...opt, order_index: index }))
                    }
                    : q
            )
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }
        formData.questions.forEach((question, index) => {
            if (!question.question_text.trim()) {
                newErrors[`question_${index}`] = 'Question text is required';
            }
            if (question.question_type === 'checkbox' && question.options.length === 0) {
                newErrors[`question_${index}_options`] = 'At least one option is required for multiple choice questions';
            }

            if (question.question_type === 'checkbox') {
                question.options.forEach((option, optIndex) => {
                    if (!option.option_text.trim()) {
                        newErrors[`question_${index}_option_${optIndex}`] = 'Option text is required';
                    }
                });
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setSaveLoading(true);
        try {
            if (isEditMode) {
                await handleEditFormSubmit();
            } else {
                await handleCreateFormSubmit();
            }
        } catch (error) {
            console.error('Error saving form:', error);
            alert(error.response?.data?.message || 'Failed to save form');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleCreateFormSubmit = async () => {
        const response = await api.post('/feedback/create', formData);

        if (response.data.success) {
            alert('Form created successfully!');
            navigate('/dashboard');
        } else {
            alert(response.data.message || 'Failed to create form');
        }
    };

    const handleEditFormSubmit = async () => {
        if (!initialFormData) return;
        const formMetadataChanged = (
            formData.title !== initialFormData.title ||
            formData.description !== initialFormData.description ||
            formData.is_public !== initialFormData.is_public ||
            formData.closed !== initialFormData.closed
        );
        if (formMetadataChanged) {
            const formUpdateData = {};
            if (formData.title !== initialFormData.title) formUpdateData.title = formData.title;
            if (formData.description !== initialFormData.description) formUpdateData.description = formData.description;
            if (formData.is_public !== initialFormData.is_public) formUpdateData.is_public = formData.is_public;
            if (formData.closed !== initialFormData.closed) formUpdateData.closed = formData.closed;

            const formResponse = await api.patch(`/feedback/${id}`, formUpdateData);
            if (!formResponse.data.success) {
                throw new Error(formResponse.data.message || 'Failed to update form metadata');
            }
        }

        // Handle question changes
        for (let i = 0; i < formData.questions.length; i++) {
            const currentQuestion = formData.questions[i];
            const initialQuestion = initialFormData.questions[i];

            // New question (no ID)
            if (!currentQuestion.id) {
                // For new questions, we'd need a separate endpoint or handle them differently
                // This is a limitation of the current backend structure
                console.log('New question detected - would need separate API endpoint');
                continue;
            }

            // Existing question - check for changes
            if (initialQuestion) {
                const questionChanged = (
                    currentQuestion.question_text !== initialQuestion.question_text ||
                    currentQuestion.is_required !== initialQuestion.is_required ||
                    currentQuestion.order_index !== initialQuestion.order_index ||
                    JSON.stringify(currentQuestion.options) !== JSON.stringify(initialQuestion.options)
                );

                if (questionChanged) {
                    await updateExistingQuestion(currentQuestion);
                }
            }
        }

        alert('Form updated successfully!');
        navigate('/dashboard');
    };

    const updateExistingQuestion = async (question) => {
        const updateData = {
            question_text: question.question_text,
            is_required: question.is_required,
            order_index: question.order_index
        };

        // Add options if it's a checkbox question
        if (question.question_type === 'checkbox') {
            updateData.options = question.options;
        }

        const response = await api.patch(`/question/${question.id}`, updateData);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to update question');
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-3 text-gray-600">Loading form...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <Navbar user={user} />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        {isEditMode ? 'Edit Form' : 'Create New Form'}
                    </h1>
                    <p className="text-gray-600">
                        {isEditMode ? 'Update your feedback form' : 'Design your feedback form with custom questions'}
                    </p>
                    {isEditMode && (
                        <div className="mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${hasChanges
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                {hasChanges ? 'Unsaved changes' : 'No changes'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Form Container */}
                <div className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-8">
                        {/* Form Title & Description */}
                        <div className="space-y-6 mb-8">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                                    Form Title *
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => handleFormChange('title', e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.title ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="Enter form title"
                                />
                                {errors.title && (
                                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                    Form Description
                                </label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleFormChange('description', e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                                    placeholder="Describe what this form is for..."
                                />
                            </div>

                            {/* Form Settings - Only show in edit mode */}
                            {isEditMode && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Public Form</label>
                                            <p className="text-xs text-gray-500 mt-1">Allow anyone to access this form</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_public}
                                                onChange={(e) => handleFormChange('is_public', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Close Form</label>
                                            <p className="text-xs text-gray-500 mt-1">Stop accepting new responses</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.closed}
                                                onChange={(e) => handleFormChange('closed', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Questions Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800">Questions</h3>
                            </div>

                            {formData.questions.map((question, questionIndex) => (
                                <div key={questionIndex} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                    <div className="flex items-start justify-between mb-4">
                                        <h4 className="text-md font-medium text-gray-700">
                                            Question {questionIndex + 1}
                                            {isEditMode && question.id && (
                                                <span className="ml-2 text-xs text-blue-600">(Existing)</span>
                                            )}
                                            {isEditMode && !question.id && (
                                                <span className="ml-2 text-xs text-green-600">(New)</span>
                                            )}
                                        </h4>
                                        {formData.questions.length > 1 && (
                                            <button
                                                onClick={() => removeQuestion(questionIndex)}
                                                className="text-red-600 hover:text-red-700 p-1"
                                                title="Remove Question"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        {/* Question Text */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-2">
                                                Question Text *
                                            </label>
                                            <input
                                                type="text"
                                                value={question.question_text}
                                                onChange={(e) => handleQuestionChange(questionIndex, 'question_text', e.target.value)}
                                                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors[`question_${questionIndex}`] ? 'border-red-500' : 'border-gray-300'
                                                    }`}
                                                placeholder="Enter your question"
                                            />
                                            {errors[`question_${questionIndex}`] && (
                                                <p className="mt-1 text-sm text-red-600">{errors[`question_${questionIndex}`]}</p>
                                            )}
                                        </div>

                                        {/* Question Type & Required */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-2">
                                                    Answer Type
                                                </label>
                                                <select
                                                    value={question.question_type}
                                                    onChange={(e) => handleQuestionChange(questionIndex, 'question_type', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                    disabled={isEditMode && question.id} // Disable type change for existing questions
                                                >
                                                    {QUESTION_TYPES.map(type => (
                                                        <option key={type.value} value={type.value}>
                                                            {type.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                {isEditMode && question.id && (
                                                    <p className="mt-1 text-xs text-gray-500">Question type cannot be changed for existing questions</p>
                                                )}
                                            </div>

                                            <div className="flex items-center">
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={question.is_required}
                                                        onChange={(e) => handleQuestionChange(questionIndex, 'is_required', e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-600">Required</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Options for checkbox questions */}
                                        {question.question_type === 'checkbox' && (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <label className="block text-sm font-medium text-gray-600">
                                                        Options *
                                                    </label>
                                                    <button
                                                        onClick={() => addOption(questionIndex)}
                                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                                    >
                                                        + Add Option
                                                    </button>
                                                </div>

                                                {errors[`question_${questionIndex}_options`] && (
                                                    <p className="mb-2 text-sm text-red-600">{errors[`question_${questionIndex}_options`]}</p>
                                                )}

                                                <div className="space-y-2">
                                                    {question.options.map((option, optionIndex) => (
                                                        <div key={optionIndex} className="flex items-center space-x-3">
                                                            <input
                                                                type="text"
                                                                value={option.option_text}
                                                                onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                                                                className={`flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors[`question_${questionIndex}_option_${optionIndex}`] ? 'border-red-500' : 'border-gray-300'
                                                                    }`}
                                                                placeholder={`Option ${optionIndex + 1}`}
                                                            />
                                                            {question.options.length > 1 && (
                                                                <button
                                                                    onClick={() => removeOption(questionIndex, optionIndex)}
                                                                    className="text-red-600 hover:text-red-700 p-1"
                                                                    title="Remove Option"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Add Question Button */}
                            {!isEditMode && <div className="text-center">
                                <button
                                    onClick={addQuestion}
                                    className="inline-flex items-center px-4 py-2 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:border-blue-400 hover:text-blue-700 transition-colors"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Question
                                </button>
                            </div>}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-8 pt-6 border-t border-gray-200">
                            <button
                                onClick={handleCancel}
                                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saveLoading || (isEditMode && !hasChanges)}
                                className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${saveLoading || (isEditMode && !hasChanges)
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                            >
                                {saveLoading ? (
                                    <div className="flex items-center">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        {isEditMode ? 'Updating...' : 'Creating...'}
                                    </div>
                                ) : (
                                    isEditMode ? 'Update Form' : 'Create Form'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EditForm;
