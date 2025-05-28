// src/GoogleAuthButton.jsx
import { supabase } from '../supabaseClient';

const GoogleAuthButton = ({ children }) => {
  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      console.error('Google sign-in error:', error.message);
    }
  };

  return (
    <button onClick={handleGoogleSignIn}>
      {children}
    </button>
  );
};

export default GoogleAuthButton;
