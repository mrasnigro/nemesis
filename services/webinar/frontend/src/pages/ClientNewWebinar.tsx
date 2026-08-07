import React from 'react';
import WebinarWizard from '../components/admin/WebinarWizard';
import { appPath } from '../lib/appBase';

const ClientNewWebinar: React.FC = () => {
  return (
    <WebinarWizard 
      submitEndpoint="/client/webinars" 
      successRedirect={appPath('/dashboard/webinars')} 
      cancelRedirect={appPath('/dashboard/webinars')} 
    />
  );
};

export default ClientNewWebinar;
