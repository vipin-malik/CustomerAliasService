import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { apolloClient } from '@core/graphql';
import { muiTheme } from '@core/theme';
import { Layout } from '@core/components';
import { NotificationProvider } from '@core/context';
import { ReloadNotice } from '@core/store';
import { ResolvePage, ResolveSessionProvider } from '@features/resolve';
import { MappingsPage, MappingsSessionProvider } from '@features/mappings';

const App = () => (
  <ThemeProvider theme={muiTheme}>
    <CssBaseline />
    <ApolloProvider client={apolloClient}>
      <NotificationProvider>
        <BrowserRouter>
          <ResolveSessionProvider>
            <MappingsSessionProvider>
              <ReloadNotice />
              <Layout>
                <Routes>
                  <Route path="/" element={<ResolvePage />} />
                  <Route path="/mappings" element={<MappingsPage />} />
                </Routes>
              </Layout>
            </MappingsSessionProvider>
          </ResolveSessionProvider>
        </BrowserRouter>
      </NotificationProvider>
    </ApolloProvider>
  </ThemeProvider>
);

export default App;
