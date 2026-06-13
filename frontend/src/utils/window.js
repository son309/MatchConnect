export const OpenCallWindow = (params) => {
    const width = 900;
    const height = 650;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const callWindow = window.open(
        `/call-window?${new URLSearchParams(params).toString()}`,
        '_blank',
        `width=${width},height=${height},top=${top},left=${left},toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=yes`
    );

    return callWindow;
};
