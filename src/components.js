import React from 'react';

export const Card = ({ children, title }) => (
  <div className="border border-gray-300 mb-4">
    <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 font-bold">
      {title}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

export const CardHeader = ({ children }) => (
  <div className="card-header">
    <h2 className="text-xl font-semibold">{children}</h2>
  </div>
);

export const CardContent = ({ children }) => (
  <div className="card-content">{children}</div>
);
export const Input = ({ 
  type = "text",
  value,
  onChange,
  className = "",
  step,
  min,
  max,
  placeholder
}) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    step={step}
    min={min}
    max={max}
    placeholder={placeholder}
    className={`
      block
      w-full
      px-3
      py-2
      border
      border-gray-300
      rounded-md
      shadow-sm
      focus:outline-none
      focus:ring-2
      focus:ring-blue-500
      focus:border-blue-500
      ${className}
    `}
  />
);

export const Button = ({ onClick, children, className }) => (
  <button
    onClick={onClick}
    className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300 ${className}`}
  >
    {children}
  </button>
);

export const Select = ({ onValueChange, value, children }) => (
  <select
    onChange={(e) => onValueChange(e.target.value)}
    value={value}
    className="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
  >
    {children}
  </select>
);
export const TooltipProvider = ({ children }) => (
  <div className="tooltip-provider">{children}</div>
);

export const Tooltip = ({ children }) => (
  <div className="tooltip">{children}</div>
);

export const TooltipTrigger = ({ asChild, children }) => (
  <div className="tooltip-trigger">
    {asChild ? children : <span>{children}</span>}
  </div>
);

export const TooltipContent = ({ children }) => (
  <div className="tooltip-content bg-gray-800 text-white p-2 rounded shadow-lg text-sm">
    {children}
  </div>
);

export const SelectTrigger = ({ children }) => <div>{children}</div>;

export const SelectValue = ({ placeholder }) => <span>{placeholder}</span>;

export const SelectContent = ({ children }) => <>{children}</>;

export const SelectItem = ({ value, children }) => (
  <option value={value}>{children}</option>
);

// New Checkbox component
export const Checkbox = ({ id, checked, onCheckedChange, label, className }) => (
  <div className="flex items-center">
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className={`form-checkbox h-5 w-5 text-blue-600 ${className}`}
    />
    {label && (
      <label htmlFor={id} className="ml-2 text-gray-700">
        {label}
      </label>
    )}
  </div>
);