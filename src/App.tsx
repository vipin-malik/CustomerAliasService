import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { apolloClient } from '@core/graphql';
import { muiTheme } from '@core/theme';
import { Layout } from '@core/components';
import { NotificationProvider } from '@core/context';
import { ResolvePage } from '@features/resolve';
import { MappingsPage } from '@features/mappings';

const App = () => (
  <ThemeProvider theme={muiTheme}>
    <CssBaseline />
    <ApolloProvider client={apolloClient}>
      <NotificationProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<ResolvePage />} />
              <Route path="/mappings" element={<MappingsPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </NotificationProvider>
    </ApolloProvider>
  </ThemeProvider>
);

export default App;
