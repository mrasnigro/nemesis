import React from 'react';
import WebinarWizard from '../components/admin/WebinarWizard';

const AdminNewWebinar: React.FC = () => {
  return <WebinarWizard 
    submitEndpoint="/api/admin/webinars" 
    successRedirect="/admin/webinars" 
    cancelRedirect="/admin/webinars" 
  />;
};

export default AdminNewWebinar;
