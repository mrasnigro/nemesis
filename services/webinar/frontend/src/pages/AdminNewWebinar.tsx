import React from 'react';
import WebinarWizard from '../components/admin/WebinarWizard';
import { appPath } from '../lib/appBase';

const AdminNewWebinar: React.FC = () => {
  return <WebinarWizard 
    submitEndpoint="/api/admin/webinars" 
    successRedirect={appPath('/admin/webinars')} 
    cancelRedirect={appPath('/admin/webinars')} 
  />;
};

export default AdminNewWebinar;
