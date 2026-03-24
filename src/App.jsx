import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { apolloClient } from './services/graphqlClient';
import muiTheme from './theme/muiTheme';
import Layout from './components/Layout';
import Resolve from './pages/Resolve';
import Mappings from './pages/Mappings';

const App = () => {
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <ApolloProvider client={apolloClient}>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Resolve />} />
              <Route path="/mappings" element={<Mappings />} />
            </Routes>
          </Layout>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '8px',
                background: '#261e40',
                color: '#e2e8f0',
                border: '1px solid rgba(82, 69, 119, 0.5)',
                fontSize: '14px',
              },
            }}
          />
        </BrowserRouter>
      </ApolloProvider>
    </ThemeProvider>
  );
};

export default App;
