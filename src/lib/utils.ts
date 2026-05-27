import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function compressImage(base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
}

export function getFirebaseFriendlyError(error: any): string {
  if (!error) return "Une erreur inconnue est survenue.";

  let code = "";
  let msg = "";

  if (typeof error === 'string') {
    msg = error;
  } else if (error && typeof error === 'object') {
    code = error.code || "";
    msg = error.message || "";
  }

  console.log("Firebase Auth error caught:", { code, message: msg });

  // 1. Check by explicit error code first
  if (code) {
    switch (code) {
      case 'auth/invalid-credential':
        return "Adresse e-mail ou mot de passe incorrect. Si vous avez créé votre compte via Google Sign-In, veuillez utiliser le bouton 'Continuer avec Google'. Sinon, veuillez vérifier votre saisie ou réinitialiser votre mot de passe.";
      case 'auth/user-not-found':
        return "Aucun utilisateur trouvé avec cette adresse e-mail. Veuillez d'abord créer un compte.";
      case 'auth/wrong-password':
        return "Le mot de passe saisi est incorrect. Veuillez réessayer ou réinitialiser votre mot de passe.";
      case 'auth/email-already-in-use':
        return "Cette adresse e-mail est déjà enregistrée. Nous vous invitons à vous connecter à votre compte existant.";
      case 'auth/invalid-email':
        return "L'adresse e-mail saisie n'est pas valide. Veuillez la corriger et réessayer.";
      case 'auth/weak-password':
        return "Le mot de passe est trop faible. Veuillez choisir un mot de passe d'au moins 6 caractères.";
      case 'auth/popup-closed-by-user':
        return "La fenêtre de connexion Google a été fermée avant la fin de l'authentification. Veuillez réessayer.";
      case 'auth/operation-not-allowed':
        return "Cette méthode de connexion (Email/Mot de passe ou Google) n'est pas activée dans la console de votre projet Firebase. Veuillez l'activer.";
      case 'auth/network-request-failed':
        return "Une erreur réseau est survenue. Veuillez vérifier votre connexion internet et réessayer.";
      case 'auth/internal-error':
        return "Une erreur interne de Firebase s'est produite. Veuillez réessayer dans quelques instants.";
      default:
        break;
    }
  }

  // 2. Secondary check inside message content in case the code wasn't explicitly populated
  const combinedStr = `${code} ${msg}`.toLowerCase();
  if (combinedStr.includes('invalid-credential') || combinedStr.includes('auth/invalid-credential')) {
    return "Adresse e-mail ou mot de passe incorrect. Si vous avez créé votre compte via Google Sign-In, veuillez utiliser le bouton 'Continuer avec Google'. Sinon, veuillez vérifier votre saisie ou réinitialiser votre mot de passe.";
  }
  if (combinedStr.includes('wrong-password') || combinedStr.includes('auth/wrong-password')) {
    return "Le mot de passe saisi est incorrect.";
  }
  if (combinedStr.includes('user-not-found') || combinedStr.includes('auth/user-not-found')) {
    return "Aucun compte n'existe avec cette adresse e-mail.";
  }
  if (combinedStr.includes('operation-not-allowed') || combinedStr.includes('auth/operation-not-allowed')) {
    return "Cette opération de connexion n'est pas autorisée. Veuillez vous assurer d'activer l'E-mail/Mot de passe et la connexion Google dans votre console Firebase.";
  }
  if (combinedStr.includes('popup-closed-by-user') || combinedStr.includes('auth/popup-closed-by-user')) {
    return "La fenêtre Google a été fermée avant la validation. Veuillez réessayer.";
  }
  if (combinedStr.includes('email-already-in-use') || combinedStr.includes('auth/email-already-in-use')) {
    return "Cette adresse e-mail est déjà associée à un compte existant. Nous vous invitons à vous connecter.";
  }
  if (combinedStr.includes('network-request-failed') || combinedStr.includes('auth/network-request-failed')) {
    return "Erreur réseau. Veuillez vérifier votre connexion internet.";
  }

  return msg || "Une erreur inattendue est survenue. Veuillez réessayer.";
}

