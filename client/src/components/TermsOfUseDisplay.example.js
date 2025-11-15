// Example usage in your component:

import TermsOfUseDisplay, { getFormattedTermsOfUse } from '../components/TermsOfUseDisplay';
import { useTranslation } from 'react-i18next';

// Method 1: Using the component directly
function MyComponent() {
  const company = useCompany(); // or however you get company data
  
  return (
    <div>
      <h2>Terms of Use</h2>
      <TermsOfUseDisplay 
        termsOfUse={company?.termsOfUse || company?.TermsOfUse} 
        className="my-custom-class"
      />
    </div>
  );
}

// Method 2: Using the helper function to get the formatted text
function MyOtherComponent() {
  const { i18n } = useTranslation();
  const company = useCompany();
  
  const formattedTerms = getFormattedTermsOfUse(
    company?.termsOfUse || company?.TermsOfUse,
    i18n.language
  );
  
  // Now you can use formattedTerms as HTML string
  return (
    <div dangerouslySetInnerHTML={{ __html: formattedTerms }} />
  );
}

// Method 3: Replace plain text display with formatted display
// BEFORE:
<div>{company?.termsOfUse}</div>

// AFTER:
<TermsOfUseDisplay termsOfUse={company?.termsOfUse} />

