import axios from 'axios';
import { useEffect, useState } from 'react';

export default () => {
    const [teste, setTeste] = useState('');
    let info: { status: number; headers: object; data: string };
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:3000');
                info = {
                    status: response.status,
                    headers: response.headers,
                    data: response.data,
                };
                setTeste(response.data);
            } catch (e) {
                console.log(info, `tivemos o seguinte erro ${e}`);
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
