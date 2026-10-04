import { Lock } from "lucide-react";
import AuthInput from "./AuthInput.jsx";

export default function PasswordField({
  id = "password",
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
  error,
  label,
  action,
  disabled,
  className = "",
  ...props
}) {
  return (
    <AuthInput
      id={id}
      label={label}
      action={action}
      icon={Lock}
      isPassword
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      autoComplete={autoComplete}
      error={error}
      disabled={disabled}
      className={className}
      {...props}
    />
  );
}