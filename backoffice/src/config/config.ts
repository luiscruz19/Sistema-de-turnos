const config = {
    basePath: '',
    AUTHORIZATION: {
        USER: process.env.AUTH_BASIC_USER,
        PASSWORD: process.env.AUTH_BASIC_PW,
    },
    AUTH_API_URL: process.env.AUTH_API_URL,
};

export default config;
