import React, { useEffect, useState } from "react";
import { auth, provider } from "./config";
import { signInWithPopup } from "firebase/auth";
import App from "./App";

function SignIn() {
    const [value, setValue] = useState('');

    const handleClick = async () => {
        try {
            const data = await signInWithPopup(auth, provider);
            const email = data.user.email;
            setValue(email);
            localStorage.setItem("email", email);
            
            await fetch('http://localhost:3000/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
        } catch (error) {
            console.error("Error signing in: ", error);
        }
    }

    useEffect(() => {
        setValue(localStorage.getItem('email'));
    }, []);

    return (
        <div>
            {value ? <App/> :
                <button onClick={handleClick}>Signin With Google</button>
            }
        </div>
    );
}

export default SignIn;