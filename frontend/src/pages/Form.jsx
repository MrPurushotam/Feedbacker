import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../libs/api';

const Form = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [showThankYou, setShowThankYou] = useState(false);

  
  const fetchForm = useCallback(async () => {
    try {
      const response = await api.get(`/feedback/${id}`);
      if (response.data.success && response.data.form) {
        setForm(response.data.form);
        const initialAnswers = {};
        response.data.form?.questions.forEach(question => {
          initialAnswers[question.id] = {
            question_id: question.id,
            answer_text: '',
            option_id: null
          };
        });
        setAnswers(initialAnswers);
      } else {
        alert(response.data.message);
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching form:', error);
      alert('Failed to load form');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  const handleAnswerChange = (questionId, value, isOption = false) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [isOption ? 'option_id' : 'answer_text']: value,
        // Clear the other field when switching types
        [isOption ? 'answer_text' : 'option_id']: isOption ? '' : null
      }
    }));

    if (errors[questionId]) {
      setErrors(prev => ({
        ...prev,
        [questionId]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    form.questions.forEach(question => {
      if (question.is_required) {
        const answer = answers[question.id];
        if (question.question_type === 'checkbox') {
          if (!answer?.option_id) {
            newErrors[question.id] = 'This field is required';
          }
        } else {
          if (!answer?.answer_text || answer.answer_text.trim() === '') {
            newErrors[question.id] = 'This field is required';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const answersArray = Object.values(answers).filter(answer => {
        return (answer.answer_text && answer.answer_text.trim() !== '') || answer.option_id;
      });

      const response = await api.post(`/response/${id}`, {
        answers: answersArray
      });

      if (response.data.success) {
        setShowThankYou(true);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        alert(response.data.message || 'Failed to submit form');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(error.response?.data?.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionInput = (question) => {
    const answer = answers[question.id];
    const hasError = errors[question.id];
    const isFormDisabled = !form.is_public || form.closed;

    switch (question.question_type) {
      case 'text':
        return (
          <textarea
            value={answer?.answer_text || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical ${
              hasError ? 'border-red-500' : 'border-gray-300'
            } ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            rows={3}
            placeholder="Enter your answer..."
            required={question.is_required}
            disabled={isFormDisabled}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={answer?.answer_text || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              hasError ? 'border-red-500' : 'border-gray-300'
            } ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            placeholder="Enter your email..."
            required={question.is_required}
            disabled={isFormDisabled}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={answer?.answer_text || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              hasError ? 'border-red-500' : 'border-gray-300'
            } ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            placeholder="Enter a number..."
            required={question.is_required}
            disabled={isFormDisabled}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={answer?.answer_text || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              hasError ? 'border-red-500' : 'border-gray-300'
            } ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            required={question.is_required}
            disabled={isFormDisabled}
          />
        );

      case 'url':
        return (
          <input
            type="url"
            value={answer?.answer_text || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              hasError ? 'border-red-500' : 'border-gray-300'
            } ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            placeholder="Enter a URL..."
            required={question.is_required}
            disabled={isFormDisabled}
          />
        );

      case 'checkbox':
        return (
          <div className="space-y-3">
            {question.options.map((option) => (
              <label key={option.id} className={`flex items-center ${isFormDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={answer?.option_id === option.id}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value, true)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  required={question.is_required}
                  disabled={isFormDisabled}
                />
                <span className={`ml-3 ${isFormDisabled ? 'text-gray-400' : 'text-gray-700'}`}>{option.option_text}</span>
              </label>
            ))}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={answer?.answer_text || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              hasError ? 'border-red-500' : 'border-gray-300'
            } ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            placeholder="Enter your answer..."
            required={question.is_required}
            disabled={isFormDisabled}
          />
        );
    }
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

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Form Not Found</h2>
          <p className="text-gray-600">The form you're looking for doesn't exist or is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">{form.title}</h1>
              {form.description && (
                <p className="text-gray-600 text-lg leading-relaxed">{form.description}</p>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Public Status Warning */}
              {!form.is_public && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="text-red-800 font-semibold">Form Not Public</h4>
                      <p className="text-red-600 text-sm mt-1">This form is not publicly accessible. You cannot submit responses to this form.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Closed Status Warning */}
              {form.closed && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <h4 className="text-yellow-800 font-semibold">Form Closed</h4>
                      <p className="text-yellow-600 text-sm mt-1">This form is no longer accepting responses.</p>
                    </div>
                  </div>
                </div>
              )}

              {form.questions.map((question, index) => (
                <div key={question.id} className="space-y-4">
                  <div className="flex items-start">
                    <span className="text-sm font-medium text-gray-500 mr-3 mt-1">
                      {index + 1}.
                    </span>
                    <div className="flex-1">
                      <label className="block text-lg font-medium text-gray-800 mb-3">
                        {question.question_text}
                        {question.is_required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      
                      {renderQuestionInput(question)}
                      
                      {errors[question.id] && (
                        <p className="mt-2 text-sm text-red-600">{errors[question.id]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting || !form.is_public || form.closed}
                  className={`w-full px-6 py-4 rounded-lg font-medium text-white transition-colors ${
                    submitting || !form.is_public || form.closed
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Submitting...
                    </div>
                  ) : !form.is_public ? (
                    'Form Not Public - Cannot Submit'
                  ) : form.closed ? (
                    'Form Closed - Cannot Submit'
                  ) : (
                    'Submit Response'
                  )}
                </button>
                
                {(!form.is_public || form.closed) && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    {!form.is_public 
                      ? 'This form is private and not accepting public responses.'
                      : 'This form has been closed and is no longer accepting responses.'
                    }
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>

      {showThankYou && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Thank You!</h3>
              <p className="text-gray-600 mb-4">Your response has been submitted successfully.</p>
              <p className="text-sm text-gray-500">Redirecting in 2 seconds...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Form;
