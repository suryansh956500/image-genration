import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex justify-center items-center">
        <svg width="80" height="80" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <style>{`
            .spinner_z9k8{transform-origin:center;animation:spinner_StKS .75s infinite linear}
            @keyframes spinner_StKS{100%{transform:rotate(360deg)}}
            `}</style>
            <g className="spinner_z9k8">
                <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25" className="fill-light-accent dark:fill-dark-accent"/>
                <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75A11,11,0,0,0,12,1Z" className="fill-light-accent dark:fill-dark-accent"/>
            </g>
        </svg>
    </div>
  );
};

export default Loader;
