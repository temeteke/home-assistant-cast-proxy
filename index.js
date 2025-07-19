const express = require('express');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./openapi.yaml');


const app = express();
const port = process.env.PORT || 3000;

// Environment variables
const HOME_ASSISTANT_URL = process.env.HOME_ASSISTANT_URL;
const HOME_ASSISTANT_TOKEN = process.env.HOME_ASSISTANT_TOKEN;
const MEDIA_PLAYER_INCLUDE_REGEX = process.env.MEDIA_PLAYER_INCLUDE_REGEX;

if (!HOME_ASSISTANT_URL || !HOME_ASSISTANT_TOKEN) {
  console.error('HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN must be set in .env file');
  process.exit(1);
}

// Middleware

app.use(express.json());

// Serve OpenAPI documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Axios instance for Home Assistant API
const haApi = axios.create({
  baseURL: HOME_ASSISTANT_URL,
  headers: {
    'Authorization': `Bearer ${HOME_ASSISTANT_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// --- API Endpoints ---

// GET /cast-proxy/media-players
app.get('/cast-proxy/media-players', async (req, res) => {
  try {
    const response = await haApi.get('/api/states');
    let mediaPlayers = response.data
      .filter(entity => entity.entity_id.startsWith('media_player.'))
      .map(player => ({
        entity_id: player.entity_id,
        friendly_name: player.attributes.friendly_name,
      }));

    if (MEDIA_PLAYER_INCLUDE_REGEX) {
      const regex = new RegExp(MEDIA_PLAYER_INCLUDE_REGEX, 'i'); // 'i' for case-insensitive
      mediaPlayers = mediaPlayers.filter(player =>
        regex.test(player.entity_id)
      );
    }
    res.json(mediaPlayers);
  } catch (error) {
    console.error('Error fetching media players:', error.message);
    res.status(500).json({ error: 'Failed to fetch media players from Home Assistant.' });
  }
});

// POST /cast-proxy/cast
app.post('/cast-proxy/cast', async (req, res) => {
  const { entity_id, media_url, media_content_type = 'video' } = req.body;

  if (!entity_id || !media_url) {
    return res.status(400).json({ error: 'entity_id and media_url are required.' });
  }

  try {
    // 1. Turn on the device
    console.log(`Turning on ${entity_id}...`);
    await haApi.post('/api/services/homeassistant/turn_on', { entity_id });

    // 2. Wait for the device to boot and become ready
    console.log(`Waiting for media player ${entity_id} to become ready...`);
    try {
      await waitForMediaPlayerReady(entity_id, haApi);
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: error.message });
    }

    // 3. Play the media
    console.log(`Casting ${media_url} to ${entity_id}...`);
    await haApi.post('/api/services/media_player/play_media', {
      entity_id,
      media_content_id: media_url,
      media_content_type,
    });

    res.json({ message: `Cast command sent successfully to ${entity_id}` });

  } catch (error) {
    console.error('Error processing cast command:', error.response ? error.response.data : error.message);
    res.status(500).json({
      error: 'An error occurred while processing the cast command.',
      details: error.response ? error.response.data : 'No response from Home Assistant',
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Proxy server listening at http://localhost:${port}`);
});

// Function to poll media player state until it's ready
async function waitForMediaPlayerReady(entityId, haApi, timeout = 30000, interval = 2000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await haApi.get(`/api/states/${entityId}`);
      const state = response.data.state;
      // Check if the state indicates it's ready (e.g., 'on', 'idle', 'playing')
      // You might need to adjust this logic based on your specific media player's states
      if (state && state !== 'unavailable' && state !== 'off') {
        console.log(`Media player ${entityId} is ready (state: ${state}).`);
        return;
      }
    } catch (error) {
      // Log error but continue polling if it's just a temporary network issue or not found yet
      console.warn(`Failed to get state for ${entityId}: ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Media player ${entityId} did not become ready within ${timeout / 1000} seconds.`);
}
