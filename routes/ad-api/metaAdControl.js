import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_API_VERSION = 'v19.0';

export async function stopMetaAd(req, res) {
  const { campaignId } = req.body;

  if (!campaignId) {
    return res.status(400).json({ success: false, error: 'campaignId is required' });
  }

  try {
    const url = `https://graph.facebook.com/${META_API_VERSION}/${campaignId}`;
    const params = {
      access_token: META_ACCESS_TOKEN,
      status: 'PAUSED',
    };

    const response = await axios.post(url, null, { params });

    if (response.data.success || response.data.id) {
      return res.json({ success: true, message: '광고 중지 성공', result: response.data });
    } else {
      throw new Error('Meta API 응답 실패');
    }
  } catch (error) {
    console.error('Meta 광고 중지 실패:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: '광고 중지 실패',
      details: error.response?.data || error.message,
    });
  }
}

export async function startMetaAd(req, res) {
  const { campaignId } = req.body;

  if (!campaignId) {
    return res.status(400).json({ success: false, error: 'campaignId is required' });
  }

  try {
    const url = `https://graph.facebook.com/${META_API_VERSION}/${campaignId}`;
    const params = {
      access_token: META_ACCESS_TOKEN,
      status: 'ACTIVE',
    };

    const response = await axios.post(url, null, { params });

    if (response.data.success || response.data.id) {
      return res.json({ success: true, message: '광고 시작 성공', result: response.data });
    } else {
      throw new Error('Meta API 응답 실패');
    }
  } catch (error) {
    console.error('Meta 광고 시작 실패:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: '광고 시작 실패',
      details: error.response?.data || error.message,
    });
  }
}

export async function getMetaAdStatus(req, res) {
  const { campaignId } = req.query;

  if (!campaignId) {
    return res.status(400).json({ success: false, error: 'campaignId is required' });
  }

  try {
    const url = `https://graph.facebook.com/${META_API_VERSION}/${campaignId}`;
    const params = {
      access_token: META_ACCESS_TOKEN,
      fields: 'status,name',
    };

    const response = await axios.get(url, { params });

    return res.json({ success: true, status: response.data.status, name: response.data.name });
  } catch (error) {
    console.error('Meta 광고 상태 확인 실패:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: '광고 상태 확인 실패',
      details: error.response?.data || error.message,
    });
  }
}