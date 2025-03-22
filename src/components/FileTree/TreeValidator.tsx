import React, { useEffect, useState } from 'react';
import { validateTreeParsing } from '../../utils/treeUtils';

interface TreeValidatorProps {
  treeText: string;
  treeJson?: string;
}

/**
 * Component for validating tree parsing logic.
 * This component is purely for debugging and testing.
 */
const TreeValidator: React.FC<TreeValidatorProps> = ({ treeText, treeJson }) => {
  const [validationResult, setValidationResult] = useState<{ valid: boolean; details: any } | null>(null);

  useEffect(() => {
    if (treeText) {
      const result = validateTreeParsing(treeText, treeJson);
      setValidationResult(result);
      
      // Log validation results to console for debugging
      console.log('Tree Validation Results:', result);
    }
  }, [treeText, treeJson]);

  if (!validationResult) {
    return <div className="tree-validator">Validating tree...</div>;
  }

  const { valid, details } = validationResult;

  return (
    <div className="tree-validator" style={{ margin: '10px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Tree Validation</h3>
      <div style={{ color: valid ? 'green' : 'red', fontWeight: 'bold' }}>
        Status: {valid ? 'Valid' : 'Invalid'}
      </div>
      
      {details.parsedLines > 0 && (
        <div>Lines parsed: {details.parsedLines}</div>
      )}
      
      {details.warnings && details.warnings.length > 0 && (
        <div>
          <h4 style={{ margin: '10px 0 5px 0' }}>Warnings:</h4>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            {details.warnings.map((warning: string, index: number) => (
              <li key={index} style={{ color: 'orange' }}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      
      {details.errors && details.errors.length > 0 && (
        <div>
          <h4 style={{ margin: '10px 0 5px 0' }}>Errors:</h4>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            {details.errors.map((error: string, index: number) => (
              <li key={index} style={{ color: 'red' }}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TreeValidator; 