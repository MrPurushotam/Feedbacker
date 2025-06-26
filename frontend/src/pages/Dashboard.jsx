import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../libs/api';
import Navbar from '../components/navbar';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredForm, setHoveredForm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [sharePopover, setSharePopover] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const userResponse = await api.get(`user/`);
      if (userResponse.data.success) {
        setUser(userResponse.data.user);
      }
      if (!userResponse.data.success) {
        alert(userResponse.data.message);
      }
      const formsResponse = await api.get(
        `feedback/all?id=${userResponse.data.user.id}`,
      );
      if (!formsResponse.data.success) {
        alert(formsResponse.data.message);
      }
      if (formsResponse.data.success) {
        setForms(formsResponse.data.forms || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`Failed to load data: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  }, [navigate, serverUrl, api]);

  useEffect(() => {
    if (!loading) {
      fetchUserData();
    }
  }, [navigate, fetchUserData]);

  // Close share popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sharePopover && !event.target.closest('.share-modal')) {
        closeSharePopover();
      }
    };

    if (sharePopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sharePopover]);

  const handleDeleteForm = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this form?')) {
      return;
    }
    setDeleteLoading(formId);
    try {
      await api.delete(`feedback/${formId}`);
      setForms(forms.filter(form => form.id !== formId && form._id !== formId));
    } catch (error) {
      console.error('Error deleting form:', error);
      alert(`Failed to delete form: ${error.response?.data?.message || error.message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEditForm = (formId) => {
    navigate(`/form/${formId}/edit`);
  };

  const handleViewFormDetails = (formId) => {
    navigate(`/detail/${formId}`);
  };

  const handleViewForm = (formId) => {
    navigate(`/form/${formId}`);
  };

  const handleShareForm = (form, e) => {
    e.stopPropagation();
    setSharePopover(sharePopover === (form.id || form._id) ? null : (form.id || form._id));
  };

  const handleCopyUrl = async (formId) => {
    const formUrl = `${window.location.origin}/form/${formId}`;
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = formUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const closeSharePopover = () => {
    setSharePopover(null);
    setCopySuccess(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-indigo-100/50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar user={user}/>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {user?.name || 'User'}!
          </h2>
          <p className="text-gray-600">
            Manage your feedback forms and track responses.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="mb-8">
          <button
            onClick={() => navigate('/form/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center transition-colors shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Form
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 bg-white/80 backdrop-blur-sm shadow-lg rounded-xl min-h-[70vh] p-6">
          {forms.map((form) => (
            <div
              key={form.id || form._id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer relative group h-48 overflow-hidden border border-gray-100 hover:border-purple-200"
              onMouseEnter={() => setHoveredForm(form.id || form._id)}
              onMouseLeave={() => setHoveredForm(null)}
              onClick={() => handleViewFormDetails(form.id || form._id)}
            >
              <div className="p-6 h-full flex flex-col justify-between">
                {/* Form Icon and Content */}
                <div>
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-800 text-center mb-2 line-clamp-2" title={form.title || 'Untitled Form'}>
                    {form.title || 'Untitled Form'}
                  </h3>

                  <p className="text-sm text-gray-600 text-center line-clamp-2 mb-4" title={form.description}>
                    {form.description}
                  </p>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500 pt-1 pb-3 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8z" />
                    </svg>
                    <span>{form.response_count} responses</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{form.created_at ? new Date(form.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}</span>
                  </div>
                </div>
              </div>

              {hoveredForm === (form.id || form._id) && (
                <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {/* Eye Icon - View Form */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewForm(form.id || form._id);
                    }}
                    className="bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="View Form"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>

                  {/* Share Icon - Share Form */}
                  <button
                    onClick={(e) => handleShareForm(form, e)}
                    className="bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    title="Share Form"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </button>

                  {/* Edit Icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditForm(form.id || form._id);
                    }}
                    className="bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="Edit Form"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Delete Icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteForm(form.id || form._id);
                    }}
                    disabled={deleteLoading === (form.id || form._id)}
                    className="bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                    title="Delete Form"
                  >
                    {deleteLoading === (form.id || form._id) ? (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}

          {forms.length === 0 && !loading && (
            <div className="col-span-full text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No forms yet</h3>
              <p className="text-gray-600 mb-4">Create your first feedback form to get started</p>
              <button
                onClick={() => navigate('/form/create')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create Your First Form
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Share Modal */}
      {sharePopover && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full share-modal">
            {(() => {
              const currentForm = forms.find(f => (f.id || f._id) === sharePopover);
              if (!currentForm) return null;
              
              return (
                <>
                  <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Share Form</h3>
                    <button
                      onClick={closeSharePopover}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-1">{currentForm.title || 'Untitled Form'}</h4>
                      <p className="text-sm text-gray-600">{currentForm.description}</p>
                    </div>

                    {/* Form Status Warnings */}
                    {currentForm.closed && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-red-700 text-sm font-medium">Form is closed</span>
                        </div>
                        <p className="text-red-600 text-xs mt-1">This form is not accepting new responses.</p>
                      </div>
                    )}

                    {!currentForm.is_public && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-yellow-700 text-sm font-medium">Form is private</span>
                        </div>
                        <p className="text-yellow-600 text-xs mt-1">This form is not publicly accessible.</p>
                      </div>
                    )}

                    {/* URL Copy Section */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Form URL:</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={`${window.location.origin}/form/${currentForm.id || currentForm._id}`}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => handleCopyUrl(currentForm.id || currentForm._id)}
                          className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium flex items-center space-x-1"
                        >
                          {copySuccess ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Status Summary */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Status: {currentForm.closed ? 'Closed' : 'Open'}</span>
                        <span>Visibility: {currentForm.is_public ? 'Public' : 'Private'}</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
