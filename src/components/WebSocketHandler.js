import { useEffect } from 'react';
const WSTOKEN = process.env.REACT_APP_WS_TOKEN;
//const WS_URL = `ws://pepwgp00791:4001/path?token=${WSTOKEN}`;
const WebSocketHandler = ({ setShouldDisplay, setReloadCountdown }) => {

  useEffect(() => {
    // Construct the WebSocket URL with the current page URL
    const pageUrl = encodeURIComponent(window.location.href);
    const WS_URL = `ws://pepwgp00791:4001/path?token=${WSTOKEN}&pageUrl=${pageUrl}`;
    //console.log(`WebSocket URL: ${WS_URL}`);
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('Connected to the WebSocket');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'UPDATE_FINISHED_ALL_PROD') {
        // Set the notification to be displayed and start the countdown for auto-reload.
        setShouldDisplay(true);
        setReloadCountdown(30);
      }
      // handle other message types as needed
    };

    return () => {
      ws.close();
    };
  }, [setShouldDisplay, setReloadCountdown]);

  return null;
};

export default WebSocketHandler;