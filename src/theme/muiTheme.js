import { createTheme } from '@mui/material/styles';

const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#a855f7',
      light: '#c084fc',
      dark: '#9333ea',
    },
    secondary: {
      main: '#d946ef',
      light: '#e879f9',
      dark: '#c026d3',
    },
    background: {
      default: '#150f24',
      paper: '#1c1532',
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
    },
    divider: 'rgba(82, 69, 119, 0.4)',
    success: { main: '#22c55e' },
    warning: { main: '#eab308' },
    error: { main: '#ef4444' },
  },
  typography: {
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    fontSize: 13,
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(82, 69, 119, 0.3)',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#261e40',
            borderBottom: '1px solid rgba(82, 69, 119, 0.4)',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#94a3b8',
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid rgba(82, 69, 119, 0.2)',
            fontSize: '0.8125rem',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'rgba(168, 85, 247, 0.08)',
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid rgba(82, 69, 119, 0.4)',
          },
          '& .MuiDataGrid-selectedRowCount': {
            color: '#c084fc',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#524577',
          '&.Mui-checked': {
            color: '#a855f7',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#1c1532',
            '& fieldset': {
              borderColor: 'rgba(82, 69, 119, 0.5)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(168, 85, 247, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#a855f7',
            },
          },
        },
      },
    },
  },
});

export default muiTheme;
