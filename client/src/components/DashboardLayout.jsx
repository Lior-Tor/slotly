import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { keyframes } from '@mui/system';
import { Menu as MenuIcon } from '@mui/icons-material';
import Sidebar from './Sidebar';

const pageEnter = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const SIDEBAR_WIDTH = 240;

/**
 * Layout wrapper for all /dashboard/* pages.
 * - Desktop (md+): fixed sidebar (240px) + scrollable main content area
 * - Mobile (<md): sidebar hidden; a top AppBar with a hamburger opens a temporary Drawer
 *
 * @param {React.ReactNode} children — the page component rendered in the main content area
 */
export default function DashboardLayout({ children }) {
  const theme = useTheme();
  // useMediaQuery returns true/false and updates live when the window is resized
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // md = 900px
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  return (
    // Outer flex container — sidebar and main content sit side by side on desktop
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* Desktop sidebar — always visible on md+ */}
      {!isMobile && <Sidebar />}

      {/* Mobile: top AppBar with hamburger.
          Separate from the Drawer below because they serve different roles */}
      {isMobile && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            borderBottom: '1px solid #E5E7EB',
            color: 'text.primary',
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              aria-label="Ouvrir le menu"
              onClick={() => setDrawerOpen(true)}
              sx={{ color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Mobile: temporary drawer containing the same Sidebar.
          variant="temporary" = hidden by default, slides in when open=true,
          closes when clicking the backdrop */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }} // Better mobile performance
          sx={{ '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' } }}
        >
          <Sidebar />
        </Drawer>
      )}

      {/* Main content area.
          ml offsets the content so it isn't hidden behind the fixed sidebar on desktop.
          mt accounts for the fixed AppBar height (64px) on mobile so content starts below it. */}
      <Box
        component="main"
        sx={{
          flex: 1,
          ml: isMobile ? 0 : `${SIDEBAR_WIDTH}px`,
          mt: isMobile ? '64px' : 0,
          p: 4,
          overflowY: 'auto',
        }}
      >
        {/* key={location.pathname} forces React to remount this Box on every route change,
            which restarts the CSS animation — giving each page a fresh entrance */}
        <Box key={location.pathname} sx={{ animation: `${pageEnter} 300ms ease forwards` }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
