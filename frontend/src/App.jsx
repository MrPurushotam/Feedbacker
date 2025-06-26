import './App.css'
import { Route, Routes, BrowserRouter } from 'react-router-dom'

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Form from "./pages/Form";
import Details from './pages/Details';
import EditForm from './pages/EditFormNew';
function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* public route */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/form/:id" element={<Form />} />

          {/* private route */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/detail/:id" element={<Details />} /> 
          <Route path="/form/:id/edit" element={<EditForm />} />
          <Route path="/form/create" element={<EditForm />} />
          
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
