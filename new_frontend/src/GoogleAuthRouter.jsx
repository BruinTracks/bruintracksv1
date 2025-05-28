import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

export const GoogleAuthRouter = () => {
    const { session, loading } = useAuth();
    const [checked, setChecked] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
console.log(location.pathname);
    useEffect(() => {
    const checkIfNewUser = async () => {
        //console.log("CHECK");
        //console.log(session);
        //console.log(session?.user);
        //console.log(location);
        if (!session || !session?.user) return;
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
            if (location.pathname == "/") navigate('/Home');
            console.log('RETURNING USER');
        }

        setChecked(true);
    };

    checkIfNewUser();
    }, [session, loading, navigate]);
};