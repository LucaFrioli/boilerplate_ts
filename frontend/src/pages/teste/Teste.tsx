import axios from 'axios';
import { useEffect, useState } from 'react';


const HelloWord = () => {
    const [teste, setTeste] = useState('');
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:3000');
                setTeste(response.data);
            } catch (e) {
                console.log(
                    'segue os erros capturados ao tentar acessar a API\n',
                    e
                );
                setTeste('Olá dei erro');
            }
        };
        fetchData();
    }, []);

    return (
        <div>
            <h2>{teste}</h2>
            <p>e vim do meu backend</p>
        </div>
    );
};

export default HelloWord;
