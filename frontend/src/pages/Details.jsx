import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../libs/api';
import Navbar from '../components/navbar';

const Details = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Redirect to dashboard if no ID provided
  useEffect(() => {
    if (!id) {
      navigate('/dashboard');
      return;
    }
  }, [id, navigate]);

  const fetchUserData = useCallback(async () => {
    try {
      const response = await api.get('/user/');
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, []);

  const fetchFormDetails = useCallback(async () => {
    try {
      const response = await api.get(`/feedback/detail/${id}`);
      if (response.data.success) {
        setForm(response.data.form);
      } else {
        alert('Form not found or access denied');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching form details:', error);
      alert('Failed to load form details');
      navigate('/dashboard');
    }
  }, [id, navigate]);

  const fetchResponses = useCallback(async (page = 1) => {
    setResponsesLoading(true);
    try {
      const response = await api.get(`/response/all/${id}?page=${page}&limit=${pagination.limit}`);
      if (response.data.success) {
        setResponses(response.data.responses);
        setPagination(response.data.pagination);
      } else {
        // If no responses, it's still a success case
        setResponses([]);
        setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }));
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
      setResponses([]);
    } finally {
      setResponsesLoading(false);
    }
  }, [id, pagination.limit]);

  useEffect(() => {
    if (id) {
      const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchUserData(), fetchFormDetails()]);
        await fetchResponses();
        setLoading(false);
      };
      loadData();
    }
  }, [id, fetchUserData, fetchFormDetails, fetchResponses]);

  const handlePageChange = (newPage) => {
    fetchResponses(newPage);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAnswerDisplay = (answer) => {
    if (answer.option_text) {
      return answer.option_text;
    }
    if (answer.answer_text) {
      return answer.answer_text;
    }
    return 'No answer provided';
  };

  const getQuestionById = (questionId) => {
    return form?.questions?.find(q => q.id === questionId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading form details...</span>
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
          <p className="text-gray-600">The form you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar user={user} />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Form Details Header */}
        <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{form.title}</h1>
                {form.description && (
                  <p className="text-gray-600 text-lg leading-relaxed mb-4">{form.description}</p>
                )}
                <p className="text-sm text-gray-500">Created on {formatDate(form.created_at)}</p>
              </div>
              
              <div className="flex flex-col space-y-2 ml-6">
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    form.is_public 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {form.is_public ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      )}
                    </svg>
                    {form.is_public ? 'Public' : 'Private'}
                  </span>
                  
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    form.closed 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {form.closed ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      )}
                    </svg>
                    {form.closed ? 'Closed' : 'Open'}
                  </span>
                </div>
                
                <div className="text-right">
                  <span className="text-2xl font-bold text-blue-600">{pagination.total}</span>
                  <p className="text-sm text-gray-500">Total Responses</p>
                </div>
              </div>
            </div>

            {/* Form Questions Preview */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Form Questions ({form.questions.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.questions.map((question, index) => (
                  <div key={question.id} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {index + 1}. {question.question_text}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {question.question_type}
                      </span>
                      {question.is_required && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Responses Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Form Responses</h2>
              {responsesLoading && (
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-gray-600">Loading responses...</span>
                </div>
              )}
            </div>
          </div>

          {responses.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Responses Yet</h3>
              <p className="text-gray-600">This form hasn't received any responses yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {responses.map((response, responseIndex) => (
                <div key={response.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Response #{responseIndex + 1 + (pagination.page - 1) * pagination.limit}
                    </h3>
                    <span className="text-sm text-gray-500">
                      Submitted on {formatDate(response.created_at)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {response.answers.map((answer) => {
                      const question = getQuestionById(answer.question_id);
                      return (
                        <div key={answer.question_id} className="bg-gray-50 rounded-lg p-4">
                          <p className="font-medium text-gray-800 mb-2">
                            {question?.question_text || 'Unknown Question'}
                          </p>
                          <div className="bg-white rounded p-3 border border-gray-200">
                            <p className="text-gray-700">
                              {getAnswerDisplay(answer)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pagination.page === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <span className="px-3 py-2 text-sm text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pagination.page === pagination.totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Details;
