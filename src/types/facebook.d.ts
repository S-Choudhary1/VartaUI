interface FBLoginResponse {
  authResponse?: {
    code?: string;
    accessToken?: string;
    userID?: string;
    expiresIn?: number;
    signedRequest?: string;
  };
  status: 'connected' | 'not_authorized' | 'unknown';
}

interface FBLoginOptions {
  config_id?: string;
  response_type?: string;
  override_default_response_type?: boolean;
  extras?: Record<string, unknown>;
}

interface FB {
  init(params: {
    appId: string;
    cookie?: boolean;
    xfbml?: boolean;
    version: string;
  }): void;
  login(callback: (response: FBLoginResponse) => void, options?: FBLoginOptions): void;
}

interface Window {
  FB?: FB;
  fbAsyncInit?: () => void;
}
