import { clsx, type ClassValue } from 'clsx'

// Conditionally join class names. (tailwind-merge can be layered on later if
// conflicting utility classes become an issue.)
export const cn = (...inputs: ClassValue[]) => clsx(inputs)
