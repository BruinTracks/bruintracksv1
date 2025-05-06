import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export const GoogleAuthRouter = () => {
    const { session, loading } = useAuth();
    const [checked, setChecked] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
    const checkIfNewUser = async () => {
        if (!session || !session?.user) navigate('/');
        if (loading || checked) return;

        const { data, error } = await supabase
        .from('profiles')
        .select('profile_id')
        .eq('profile_id', session.user.id)
        .single();

        console.log(data)
        console.log(error)

        if (error && (error.code == '42P01' || error.code === 'PGRST116')) {
        console.log('NEW USER');
        navigate('/Form');
        } else {
        console.log('RETURNING USER');
        navigate('/Home');
        }

        setChecked(true);
    };

    checkIfNewUser();
    }, [session, loading, navigate]);
};