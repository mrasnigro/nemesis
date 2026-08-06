import React from 'react';
import WebinarWizard from '../components/admin/WebinarWizard';

const ClientNewWebinar: React.FC = () => {
  return (
    <WebinarWizard 
      submitEndpoint="/client/webinars" 
      successRedirect="/dashboard/webinars" 
      cancelRedirect="/dashboard/webinars" 
    />
  );
};

export default ClientNewWebinar;
