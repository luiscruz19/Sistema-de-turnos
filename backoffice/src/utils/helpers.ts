export function validatePassword(password: string): string[] {
    const errors: string[] = [];
    if (!password) {
        errors.push('Debes ingresar una contraseña');
        return errors;
    }
    if (password.length < 8) errors.push('La contraseña debe tener al menos 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('La contraseña debe tener al menos una letra mayúscula');
    if (!/[a-z]/.test(password)) errors.push('La contraseña debe tener al menos una letra minúscula');
    if (!/[0-9]/.test(password)) errors.push('La contraseña debe tener al menos un número');
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/]/.test(password)) errors.push('La contraseña debe tener al menos un carácter especial');
    return errors;
}
