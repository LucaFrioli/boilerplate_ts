import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home/Home';
import Teste from './pages/teste/Teste';
import './assets/css/main.css'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/teste" element={<Teste />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
