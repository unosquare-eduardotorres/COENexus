import scout9Avatar from '../../assets/agents/scout9-avatar.png'
import scout9Banner from '../../assets/agents/scout9-banner.png'
import vigilAvatar from '../../assets/agents/vigil-avatar.png'
import vigilBanner from '../../assets/agents/vigil-banner.png'
import switchboardAvatar from '../../assets/agents/switchboard-avatar.png'
import switchboardBanner from '../../assets/agents/switchboard-banner.png'
import senseiAvatar from '../../assets/agents/sensei-avatar.png'
import senseiBanner from '../../assets/agents/sensei-banner.png'
import paydayAvatar from '../../assets/agents/payday-avatar.png'
import paydayBanner from '../../assets/agents/payday-banner.png'

export const AGENT_IMAGES: Record<string, { avatar: string; banner: string }> = {
  'scout-9': { avatar: scout9Avatar, banner: scout9Banner },
  'vigil': { avatar: vigilAvatar, banner: vigilBanner },
  'switchboard': { avatar: switchboardAvatar, banner: switchboardBanner },
  'sensei': { avatar: senseiAvatar, banner: senseiBanner },
  'payday': { avatar: paydayAvatar, banner: paydayBanner },
}
