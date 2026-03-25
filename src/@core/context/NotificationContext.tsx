import { createContext, useContext, useReducer, useCallback } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert, { type AlertColor } from '@mui/material/Alert';

interface Notification {
  id: number;
  message: string;
  severity: AlertColor;
}

interface NotificationState {
  notifications: Notification[];
  nextId: number;
}

type NotificationAction =
  | { type: 'ADD'; payload: { message: string; severity: AlertColor } }
  | { type: 'REMOVE'; payload: { id: number } };

interface NotificationContextValue {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const notificationReducer = (
  state: NotificationState,
  action: NotificationAction,
): NotificationState => {
  switch (action.type) {
    case 'ADD':
      return {
        notifications: [
          ...state.notifications,
          { id: state.nextId, message: action.payload.message, severity: action.payload.severity },
        ],
        nextId: state.nextId + 1,
      };
    case 'REMOVE':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload.id),
      };
    default:
      return state;
  }
};

const initialState: NotificationState = {
  notifications: [],
  nextId: 1,
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  const show = useCallback((message: string, severity: AlertColor) => {
    dispatch({ type: 'ADD', payload: { message, severity } });
  }, []);

  const showSuccess = useCallback((message: string) => show(message, 'success'), [show]);
  const showError = useCallback((message: string) => show(message, 'error'), [show]);
  const showWarning = useCallback((message: string) => show(message, 'warning'), [show]);

  const handleClose = useCallback((id: number) => {
    dispatch({ type: 'REMOVE', payload: { id } });
  }, []);

  return (
    <NotificationContext.Provider value={{ showSuccess, showError, showWarning }}>
      {children}
      {state.notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open
          autoHideDuration={3000}
          onClose={() => handleClose(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => handleClose(notification.id)}
            severity={notification.severity}
            variant="filled"
            sx={{
              borderRadius: '8px',
              bgcolor: '#261e40',
              color: '#e2e8f0',
              border: '1px solid rgba(82, 69, 119, 0.5)',
              '& .MuiAlert-icon': {
                color:
                  notification.severity === 'success'
                    ? '#22c55e'
                    : notification.severity === 'error'
                      ? '#ef4444'
                      : '#eab308',
              },
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
