import { useEffect, useState } from "react";
import { useHeader } from "@/contexts/HeaderContext";

export default function PrivacyPolicy() {
  const { setTitle, setSubtitle } = useHeader();
  const [htmlContent, setHtmlContent] = useState("");

  useEffect(() => {
    setTitle("Privacy Policy & Terms");
    setSubtitle("Legal agreement for Brainsees POS System");
    
    // Fetch the policy HTML from your server
    fetch('https://admin-pod.onrender.com/policies.html')
      .then(res => res.text())
      .then(html => setHtmlContent(html))
      .catch(err => console.error('Failed to load policies:', err));
  }, []);

  return (
   <div className="h-screen w-full">
  {htmlContent ? (
    <iframe 
      srcDoc={htmlContent}
      className="w-full h-full border-0"
      title="Privacy Policy"
    />
  ) : (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2">Loading policies...</span>
    </div>
  )}
</div>
  );
}