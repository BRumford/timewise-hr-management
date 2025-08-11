import { useState } from "react";

export default function InputTest() {
  const [testValue, setTestValue] = useState('');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Input Test Page</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Input (Should work normally):</label>
          <input 
            type="text"
            value={testValue}
            onChange={(e) => setTestValue(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-64"
            placeholder="Type anything here..."
          />
          <p className="text-sm text-gray-600 mt-1">Current value: {testValue}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Direct HTML Input (No React state):</label>
          <input 
            type="text"
            className="border border-gray-300 rounded px-3 py-2 w-64"
            placeholder="Direct HTML input..."
          />
        </div>
      </div>
    </div>
  );
}