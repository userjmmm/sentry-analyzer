/**
 * Sentry Webhook Handler
 *
 * This function receives webhooks from Sentry and triggers GitHub Actions
 * via repository_dispatch event.
 */

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sentryEvent = req.body;

    // Log received event for debugging
    console.log('Received Sentry webhook:', JSON.stringify(sentryEvent, null, 2));

    // Validate required environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;

    if (!githubToken || !githubOwner || !githubRepo) {
      console.error('Missing required environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Extract Sentry event data
    const eventData = {
      eventId: sentryEvent.data?.event?.event_id || sentryEvent.data?.issue?.id,
      issueId: sentryEvent.data?.issue?.id,
      title: sentryEvent.data?.issue?.title || sentryEvent.data?.event?.title,
      culprit: sentryEvent.data?.issue?.culprit || sentryEvent.data?.event?.culprit,
      level: sentryEvent.data?.issue?.level || sentryEvent.data?.event?.level,
      project: sentryEvent.data?.issue?.project?.slug || sentryEvent.data?.event?.project,
      permalink: sentryEvent.data?.issue?.permalink || sentryEvent.data?.event?.web_url,
      action: sentryEvent.action,
    };

    console.log('Parsed event data:', eventData);

    // Only process new errors (created or first_seen)
    if (!['created', 'first_seen'].includes(eventData.action)) {
      console.log(`Ignoring action: ${eventData.action}`);
      return res.status(200).json({
        message: 'Event ignored',
        action: eventData.action
      });
    }

    // Trigger GitHub Actions workflow via repository_dispatch
    const githubApiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/dispatches`;

    const githubPayload = {
      event_type: 'sentry_error',
      client_payload: {
        sentry_event_id: eventData.eventId,
        sentry_issue_id: eventData.issueId,
        error_title: eventData.title,
        error_culprit: eventData.culprit,
        error_level: eventData.level,
        project: eventData.project,
        permalink: eventData.permalink,
        timestamp: new Date().toISOString(),
      }
    };

    console.log('Triggering GitHub Actions:', githubApiUrl);
    console.log('Payload:', JSON.stringify(githubPayload, null, 2));

    const response = await fetch(githubApiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Sentry-GitHub-Bridge',
      },
      body: JSON.stringify(githubPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      return res.status(500).json({
        error: 'Failed to trigger GitHub Actions',
        details: errorText,
        status: response.status
      });
    }

    console.log('Successfully triggered GitHub Actions');

    return res.status(200).json({
      success: true,
      message: 'GitHub Actions triggered',
      eventId: eventData.eventId,
      issueId: eventData.issueId,
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
