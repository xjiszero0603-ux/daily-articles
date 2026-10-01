// ===== PCM → AAC-LC / M4A 編碼器（純 JavaScript，無相依套件，可直接貼進 Cloudflare Worker）=====
// ISO/IEC 14496-3 AAC Huffman tables (hex, comma-separated) — codebooks 1..11 + scalefactor
const AAC_HCB_CODES = [
  '7f8,1f1,7fd,3f5,68,3f0,7f7,1ec,7f5,3f1,72,3f4,74,11,76,1eb,6c,3f6,7fc,1e1,7f1,1f0,61,1f6,7f2,1ea,7fb,1f2,69,1ed,77,17,6f,1e6,64,1e5,67,15,62,12,0,14,65,16,6d,1e9,63,1e4,6b,13,71,1e3,70,1f3,7fe,1e7,7f3,1ef,60,1ee,7f0,1e2,7fa,3f3,6a,1e8,75,10,73,1f4,6e,3f7,7f6,1e0,7f9,3f2,66,1f5,7ff,1f7,7f4',
  '1f3,6f,1fd,eb,23,ea,1f7,e8,1fa,f2,2d,70,20,6,2b,6e,28,e9,1f9,66,f8,e7,1b,f1,1f4,6b,1f5,ec,2a,6c,2c,a,27,67,1a,f5,24,8,1f,9,0,7,1d,b,30,ef,1c,64,1e,c,29,f3,2f,f0,1fc,71,1f2,f4,21,e6,f7,68,1f8,ee,22,65,31,2,26,ed,25,6a,1fb,72,1fe,69,2e,f6,1ff,6d,1f6',
  '0,9,ef,b,19,f0,1eb,1e6,3f2,a,35,1ef,34,37,1e9,1ed,1e7,3f3,1ee,3ed,1ffa,1ec,1f2,7f9,7f8,3f8,ff8,8,38,3f6,36,75,3f1,3eb,3ec,ff4,18,76,7f4,39,74,3ef,1f3,1f4,7f6,1e8,3ea,1ffc,f2,1f1,ffb,3f5,7f3,ffc,ee,3f7,7ffe,1f0,7f5,7ffd,1ffb,3ffa,ffff,f1,3f0,3ffc,1ea,3ee,3ffb,ff6,ffa,7ffc,7f2,ff5,fffe,3f4,7f7,7ffb,ff7,ff9,7ffa',
  '7,16,f6,18,8,ef,1ef,f3,7f8,19,17,ed,15,1,e2,f0,70,3f0,1ee,f1,7fa,ee,e4,3f2,7f6,3ef,7fd,5,14,f2,9,4,e5,f4,e8,3f4,6,2,e7,3,0,6b,e3,69,1f3,eb,e6,3f6,6e,6a,1f4,3ec,1f0,3f9,f5,ec,7fb,ea,6f,3f7,7f9,3f3,fff,e9,6d,3f8,6c,68,1f5,3ee,1f2,7f4,7f7,3f1,ffe,3ed,1f1,7f5,7fe,3f5,7fc',
  '1fff,ff7,7f4,7e8,3f1,7ee,7f9,ff8,1ffd,ffd,7f1,3e8,1e8,f0,1ec,3ee,7f2,ffa,ff4,3ef,1f2,e8,70,ec,1f0,3ea,7f3,7eb,1eb,ea,1a,8,19,ee,1ef,7ed,3f0,f2,73,b,0,a,71,f3,7e9,7ef,1ee,ef,18,9,1b,eb,1e9,7ec,7f6,3eb,1f3,ed,72,e9,1f1,3ed,7f7,ff6,7f0,3e9,1ed,f1,1ea,3ec,7f8,ff9,1ffc,ffc,ff5,7ea,3f3,3f2,7f5,ffb,1ffe',
  '7fe,3fd,1f1,1eb,1f4,1ea,1f0,3fc,7fd,3f6,1e5,ea,6c,71,68,f0,1e6,3f7,1f3,ef,32,27,28,26,31,eb,1f7,1e8,6f,2e,8,4,6,29,6b,1ee,1ef,72,2d,2,0,3,2f,73,1fa,1e7,6e,2b,7,1,5,2c,6d,1ec,1f9,ee,30,24,2a,25,33,ec,1f2,3f8,1e4,ed,6a,70,69,74,f1,3fa,7ff,3f9,1f6,1ed,1f8,1e9,1f5,3fb,7fc',
  '0,5,37,74,f2,1eb,3ed,7f7,4,c,35,71,ec,ee,1ee,1f5,36,34,72,ea,f1,1e9,1f3,3f5,73,70,eb,f0,1f1,1f0,3ec,3fa,f3,ed,1e8,1ef,3ef,3f1,3f9,7fb,1ed,ef,1ea,1f2,3f3,3f8,7f9,7fc,3ee,1ec,1f4,3f4,3f7,7f8,ffd,ffe,7f6,3f0,3f2,3f6,7fa,7fd,ffc,fff',
  'e,5,10,30,6f,f1,1fa,3fe,3,0,4,12,2c,6a,75,f8,f,2,6,14,2e,69,72,f5,2f,11,13,2a,32,6c,ec,fa,71,2b,2d,31,6d,70,f2,1f9,ef,68,33,6b,6e,ee,f9,3fc,1f8,74,73,ed,f0,f6,1f6,1fd,3fd,f3,f4,f7,1f7,1fb,1fc,3ff',
  '0,5,37,e7,1de,3ce,3d9,7c8,7cd,fc8,fdd,1fe4,1fec,4,c,35,72,ea,ed,1e2,3d1,3d3,3e0,7d8,fcf,fd5,36,34,71,e8,ec,1e1,3cf,3dd,3db,7d0,fc7,fd4,fe4,e6,70,e9,1dd,1e3,3d2,3dc,7cc,7ca,7de,fd8,fea,1fdb,1df,eb,1dc,1e6,3d5,3de,7cb,7dd,7dc,fcd,fe2,fe7,1fe1,3d0,1e0,1e4,3d6,7c5,7d1,7db,fd2,7e0,fd9,feb,1fe3,1fe9,7c4,1e5,3d7,7c6,7cf,7da,fcb,fda,fe3,fe9,1fe6,1ff3,1ff7,7d3,3d8,3e1,7d4,7d9,fd3,fde,1fdd,1fd9,1fe2,1fea,1ff1,1ff6,7d2,3d4,3da,7c7,7d7,7e2,fce,fdb,1fd8,1fee,3ff0,1ff4,3ff2,7e1,3df,7c9,7d6,fca,fd0,fe5,fe6,1feb,1fef,3ff3,3ff4,3ff5,fe0,7ce,7d5,fc6,fd1,fe1,1fe0,1fe8,1ff0,3ff1,3ff8,3ff6,7ffc,fe8,7df,fc9,fd7,fdc,1fdc,1fdf,1fed,1ff5,3ff9,3ffb,7ffd,7ffe,1fe7,fcc,fd6,fdf,1fde,1fda,1fe5,1ff2,3ffa,3ff7,3ffc,3ffd,7fff',
  '22,8,1d,26,5f,d3,1cf,3d0,3d7,3ed,7f0,7f6,ffd,7,0,1,9,20,54,60,d5,dc,1d4,3cd,3de,7e7,1c,2,6,c,1e,28,5b,cd,d9,1ce,1dc,3d9,3f1,25,b,a,d,24,57,61,cc,dd,1cc,1de,3d3,3e7,5d,21,1f,23,27,59,64,d8,df,1d2,1e2,3dd,3ee,d1,55,29,56,58,62,ce,e0,e2,1da,3d4,3e3,7eb,1c9,5e,5a,5c,63,ca,da,1c7,1ca,1e0,3db,3e8,7ec,1e3,d2,cb,d0,d7,db,1c6,1d5,1d8,3ca,3da,7ea,7f1,1e1,d4,cf,d6,de,e1,1d0,1d6,3d1,3d5,3f2,7ee,7fb,3e9,1cd,1c8,1cb,1d1,1d7,1df,3cf,3e0,3ef,7e6,7f8,ffa,3eb,1dd,1d3,1d9,1db,3d2,3cc,3dc,3ea,7ed,7f3,7f9,ff9,7f2,3ce,1e4,3cb,3d8,3d6,3e2,3e5,7e8,7f4,7f5,7f7,ffb,7fa,3ec,3df,3e1,3e4,3e6,3f0,7e9,7ef,ff8,ffe,ffc,fff',
  '0,6,19,3d,9c,c6,1a7,390,3c2,3df,7e6,7f3,ffb,7ec,ffa,ffe,38e,5,1,8,14,37,42,92,af,191,1a5,1b5,39e,3c0,3a2,3cd,7d6,ae,17,7,9,18,39,40,8e,a3,b8,199,1ac,1c1,3b1,396,3be,3ca,9d,3c,15,16,1a,3b,44,91,a5,be,196,1ae,1b9,3a1,391,3a5,3d5,94,9a,36,38,3a,41,8c,9b,b0,c3,19e,1ab,1bc,39f,38f,3a9,3cf,93,bf,3e,3f,43,45,9e,a7,b9,194,1a2,1ba,1c3,3a6,3a7,3bb,3d4,9f,1a0,8f,8d,90,98,a6,b6,c4,19f,1af,1bf,399,3bf,3b4,3c9,3e7,a8,1b6,ab,a4,aa,b2,c2,c5,198,1a4,1b8,38c,3a4,3c4,3c6,3dd,3e8,ad,3af,192,bd,bc,18e,197,19a,1a3,1b1,38d,398,3b7,3d3,3d1,3db,7dd,b4,3de,1a9,19b,19c,1a1,1aa,1ad,1b3,38b,3b2,3b8,3ce,3e1,3e0,7d2,7e5,b7,7e3,1bb,1a8,1a6,1b0,1b2,1b7,39b,39a,3ba,3b5,3d6,7d7,3e4,7d8,7ea,ba,7e8,3a0,1bd,1b4,38a,1c4,392,3aa,3b0,3bc,3d7,7d4,7dc,7db,7d5,7f0,c1,7fb,3c8,3a3,395,39d,3ac,3ae,3c5,3d8,3e2,3e6,7e4,7e7,7e0,7e9,7f7,190,7f2,393,1be,1c0,394,397,3ad,3c3,3c1,3d2,7da,7d9,7df,7eb,7f4,7fa,195,7f8,3bd,39c,3ab,3a8,3b3,3b9,3d0,3e3,3e5,7e2,7de,7ed,7f1,7f9,7fc,193,ffd,3dc,3b6,3c7,3cc,3cb,3d9,3da,7d3,7e1,7ee,7ef,7f5,7f6,ffc,fff,19d,1c2,b5,a1,96,97,95,99,a0,a2,ac,a9,b1,b3,bb,c0,18f,4'
];
const AAC_HCB_BITS = [
  'b,9,b,a,7,a,b,9,b,a,7,a,7,5,7,9,7,a,b,9,b,9,7,9,b,9,b,9,7,9,7,5,7,9,7,9,7,5,7,5,1,5,7,5,7,9,7,9,7,5,7,9,7,9,b,9,b,9,7,9,b,9,b,a,7,9,7,5,7,9,7,a,b,9,b,a,7,9,b,9,b',
  '9,7,9,8,6,8,9,8,9,8,6,7,6,5,6,7,6,8,9,7,8,8,6,8,9,7,9,8,6,7,6,5,6,7,6,8,6,5,6,5,3,5,6,5,6,8,6,7,6,5,6,8,6,8,9,7,9,8,6,8,8,7,9,8,6,7,6,4,6,8,6,7,9,7,9,7,6,8,9,7,9',
  '1,4,8,4,5,8,9,9,a,4,6,9,6,6,9,9,9,a,9,a,d,9,9,b,b,a,c,4,6,a,6,7,a,a,a,c,5,7,b,6,7,a,9,9,b,9,a,d,8,9,c,a,b,c,8,a,f,9,b,f,d,e,10,8,a,e,9,a,e,c,c,f,b,c,10,a,b,f,c,c,f',
  '4,5,8,5,4,8,9,8,b,5,5,8,5,4,8,8,7,a,9,8,b,8,8,a,b,a,b,4,5,8,4,4,8,8,8,a,4,4,8,4,4,7,8,7,9,8,8,a,7,7,9,a,9,a,8,8,b,8,7,a,b,a,c,8,7,a,7,7,9,a,9,b,b,a,c,a,9,b,b,a,b',
  'd,c,b,b,a,b,b,c,d,c,b,a,9,8,9,a,b,c,c,a,9,8,7,8,9,a,b,b,9,8,5,4,5,8,9,b,a,8,7,4,1,4,7,8,b,b,9,8,5,4,5,8,9,b,b,a,9,8,7,8,9,a,b,c,b,a,9,8,9,a,b,c,d,c,c,b,a,a,b,c,d',
  'b,a,9,9,9,9,9,a,b,a,9,8,7,7,7,8,9,a,9,8,6,6,6,6,6,8,9,9,7,6,4,4,4,6,7,9,9,7,6,4,4,4,6,7,9,9,7,6,4,4,4,6,7,9,9,8,6,6,6,6,6,8,9,a,9,8,7,7,7,7,8,a,b,a,9,9,9,9,9,a,b',
  '1,3,6,7,8,9,a,b,3,4,6,7,8,8,9,9,6,6,7,8,8,9,9,a,7,7,8,8,9,9,a,a,8,8,9,9,a,a,a,b,9,8,9,9,a,a,b,b,a,9,9,a,a,b,c,c,b,a,a,a,b,b,c,c',
  '5,4,5,6,7,8,9,a,4,3,4,5,6,7,7,8,5,4,4,5,6,7,7,8,6,5,5,6,6,7,8,8,7,6,6,6,7,7,8,9,8,7,6,7,7,8,8,a,9,7,7,8,8,8,9,9,a,8,8,8,9,9,9,a',
  '1,3,6,8,9,a,a,b,b,c,c,d,d,3,4,6,7,8,8,9,a,a,a,b,c,c,6,6,7,8,8,9,a,a,a,b,c,c,c,8,7,8,9,9,a,a,b,b,b,c,c,d,9,8,9,9,a,a,b,b,b,c,c,c,d,a,9,9,a,b,b,b,c,b,c,c,d,d,b,9,a,b,b,b,c,c,c,c,d,d,d,b,a,a,b,b,c,c,d,d,d,d,d,d,b,a,a,b,b,b,c,c,d,d,e,d,e,b,a,b,b,c,c,c,c,d,d,e,e,e,c,b,b,c,c,c,d,d,d,e,e,e,f,c,b,c,c,c,d,d,d,d,e,e,f,f,d,c,c,c,d,d,d,d,e,e,e,e,f',
  '6,5,6,6,7,8,9,a,a,a,b,b,c,5,4,4,5,6,7,7,8,8,9,a,a,b,6,4,5,5,6,6,7,8,8,9,9,a,a,6,5,5,5,6,7,7,8,8,9,9,a,a,7,6,6,6,6,7,7,8,8,9,9,a,a,8,7,6,7,7,7,8,8,8,9,a,a,b,9,7,7,7,7,8,8,9,9,9,a,a,b,9,8,8,8,8,8,9,9,9,a,a,b,b,9,8,8,8,8,8,9,9,a,a,a,b,b,a,9,9,9,9,9,9,a,a,a,b,b,c,a,9,9,9,9,a,a,a,a,b,b,b,c,b,a,9,a,a,a,a,a,b,b,b,b,c,b,a,a,a,a,a,a,b,b,c,c,c,c',
  '4,5,6,7,8,8,9,a,a,a,b,b,c,b,c,c,a,5,4,5,6,7,7,8,8,9,9,9,a,a,a,a,b,8,6,5,5,6,7,7,8,8,8,9,9,9,a,a,a,a,8,7,6,6,6,7,7,8,8,8,9,9,9,a,a,a,a,8,8,7,7,7,7,8,8,8,8,9,9,9,a,a,a,a,8,8,7,7,7,7,8,8,8,9,9,9,9,a,a,a,a,8,9,8,8,8,8,8,8,8,9,9,9,a,a,a,a,a,8,9,8,8,8,8,8,8,9,9,9,a,a,a,a,a,a,8,a,9,8,8,9,9,9,9,9,a,a,a,a,a,a,b,8,a,9,9,9,9,9,9,9,a,a,a,a,a,a,b,b,8,b,9,9,9,9,9,9,a,a,a,a,a,b,a,b,b,8,b,a,9,9,a,9,a,a,a,a,a,b,b,b,b,b,8,b,a,a,a,a,a,a,a,a,a,a,b,b,b,b,b,9,b,a,9,9,a,a,a,a,a,a,b,b,b,b,b,b,9,b,a,a,a,a,a,a,a,a,a,b,b,b,b,b,b,9,c,a,a,a,a,a,a,a,b,b,b,b,b,b,c,c,9,9,8,8,8,8,8,8,8,8,8,8,8,8,8,8,9,5'
];
const AAC_SF_CODES = '3ffe8,3ffe6,3ffe7,3ffe5,7fff5,7fff1,7ffed,7fff6,7ffee,7ffef,7fff0,7fffc,7fffd,7ffff,7fffe,7fff7,7fff8,7fffb,7fff9,3ffe4,7fffa,3ffe3,1ffef,1fff0,fff5,1ffee,fff2,fff3,fff4,fff1,7ff6,7ff7,3ff9,3ff5,3ff7,3ff3,3ff6,3ff2,1ff7,1ff5,ff9,ff7,ff6,7f9,ff4,7f8,3f9,3f7,3f5,1f8,1f7,fa,f8,f6,79,3a,38,1a,b,4,0,a,c,1b,39,3b,78,7a,f7,f9,1f6,1f9,3f4,3f6,3f8,7f5,7f4,7f6,7f7,ff5,ff8,1ff4,1ff6,1ff8,3ff8,3ff4,fff0,7ff4,fff6,7ff5,3ffe2,7ffd9,7ffda,7ffdb,7ffdc,7ffdd,7ffde,7ffd8,7ffd2,7ffd3,7ffd4,7ffd5,7ffd6,7fff2,7ffdf,7ffe7,7ffe8,7ffe9,7ffea,7ffeb,7ffe6,7ffe0,7ffe1,7ffe2,7ffe3,7ffe4,7ffe5,7ffd7,7ffec,7fff4,7fff3';
const AAC_SF_BITS = '12,12,12,12,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,12,13,12,11,11,10,11,10,10,10,10,f,f,e,e,e,e,e,e,d,d,c,c,c,b,c,b,a,a,a,9,9,8,8,8,7,6,6,5,4,3,1,4,4,5,6,6,7,7,8,8,9,9,a,a,a,b,b,b,b,c,c,d,d,d,e,e,10,f,10,f,12,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13,13';
const AAC_SWB_1024 = {
  96: [0,4,8,12,16,20,24,28,32,36,40,44,48,52,56,64,72,80,88,96,108,120,132,144,156,172,188,212,240,276,320,384,448,512,576,640,704,768,832,896,960,1024],
  64: [0,4,8,12,16,20,24,28,32,36,40,44,48,52,56,64,72,80,88,100,112,124,140,156,172,192,216,240,268,304,344,384,424,464,504,544,584,624,664,704,744,784,824,864,904,944,984,1024],
  48: [0,4,8,12,16,20,24,28,32,36,40,48,56,64,72,80,88,96,108,120,132,144,160,176,196,216,240,264,292,320,352,384,416,448,480,512,544,576,608,640,672,704,736,768,800,832,864,896,928,1024],
  32: [0,4,8,12,16,20,24,28,32,36,40,48,56,64,72,80,88,96,108,120,132,144,160,176,196,216,240,264,292,320,352,384,416,448,480,512,544,576,608,640,672,704,736,768,800,832,864,896,928,960,992,1024],
  24: [0,4,8,12,16,20,24,28,32,36,40,44,52,60,68,76,84,92,100,108,116,124,136,148,160,172,188,204,220,240,260,284,308,336,364,396,432,468,508,552,600,652,704,768,832,896,960,1024],
  16: [0,8,16,24,32,40,48,56,64,72,80,88,100,112,124,136,148,160,172,184,196,212,228,244,260,280,300,320,344,368,396,424,456,492,532,572,616,664,716,772,832,896,960,1024],
  8: [0,12,24,36,48,60,72,84,96,108,120,132,144,156,172,188,204,220,236,252,268,288,308,328,348,372,396,420,448,476,508,544,580,620,664,712,764,820,880,944,1024],
};

// ---------------------------------------------------------------------------
// 編碼器設定
// ---------------------------------------------------------------------------
const AAC_FRAME = 1024;
const AAC_MAX_FRAME_BITS = 6144; // 單聲道每個 AAC frame 的規格上限
const AAC_SAMPLE_RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000];
const AAC_SWB_KEY = { 96000: 96, 88200: 96, 64000: 64, 48000: 48, 44100: 48, 32000: 32, 24000: 24, 22050: 24, 16000: 16, 12000: 16, 11025: 16, 8000: 8 };

let aacTables = null;
function getAacTables() {
  if (aacTables) return aacTables;
  const hex = (s) => s.split(',').map((v) => parseInt(v, 16));
  aacTables = {
    codes: AAC_HCB_CODES.map((s) => Uint32Array.from(hex(s))),
    bits: AAC_HCB_BITS.map((s) => Uint8Array.from(hex(s))),
    sfCodes: Uint32Array.from(hex(AAC_SF_CODES)),
    sfBits: Uint8Array.from(hex(AAC_SF_BITS)),
  };
  return aacTables;
}

// ---------------------------------------------------------------------------
// 位元寫入器
// ---------------------------------------------------------------------------
class AacBitWriter {
  constructor(capacityBytes) {
    this.buf = new Uint8Array(capacityBytes);
    this.pos = 0; // 目前位元位置
  }
  write(value, n) {
    for (let i = n - 1; i >= 0; i--) {
      if ((value >>> i) & 1) this.buf[this.pos >> 3] |= 0x80 >> (this.pos & 7);
      this.pos++;
    }
  }
  bytes() {
    return this.buf.slice(0, (this.pos + 7) >> 3);
  }
}

// ---------------------------------------------------------------------------
// MDCT（2048 點 sine window → 1024 個頻譜係數），以 512 點複數 FFT 實作
// ---------------------------------------------------------------------------
function createMdct() {
  const N = 2 * AAC_FRAME, M = AAC_FRAME, H = M / 2;
  const win = new Float64Array(N);
  for (let n = 0; n < N; n++) win[n] = Math.sin((Math.PI / N) * (n + 0.5));
  const twRe = new Float64Array(H), twIm = new Float64Array(H);
  const postRe = new Float64Array(H), postIm = new Float64Array(H);
  for (let n = 0; n < H; n++) {
    const a = (-Math.PI * (n + 0.25)) / M;
    twRe[n] = Math.cos(a); twIm[n] = Math.sin(a);
    postRe[n] = Math.cos((-Math.PI * n) / M); postIm[n] = Math.sin((-Math.PI * n) / M);
  }
  const fftRe = new Float64Array(H / 2), fftIm = new Float64Array(H / 2);
  for (let i = 0; i < H / 2; i++) {
    fftRe[i] = Math.cos((-2 * Math.PI * i) / H); fftIm[i] = Math.sin((-2 * Math.PI * i) / H);
  }
  const rev = new Uint16Array(H);
  const logH = Math.log2(H);
  for (let i = 0; i < H; i++) {
    let r = 0;
    for (let b = 0; b < logH; b++) r |= ((i >> b) & 1) << (logH - 1 - b);
    rev[i] = r;
  }
  const u = new Float64Array(M), re = new Float64Array(H), im = new Float64Array(H);

  // input: 2048 個樣本；output: 1024 個 MDCT 係數
  return function mdct(input, output) {
    // 加窗並折疊成 DCT-IV 的輸入：(a,b,c,d) → (-c_r - d, a - b_r)
    for (let n = 0; n < H; n++) {
      u[n] = -win[3 * H - 1 - n] * input[3 * H - 1 - n] - win[3 * H + n] * input[3 * H + n];
      u[H + n] = win[n] * input[n] - win[M - 1 - n] * input[M - 1 - n];
    }
    // DCT-IV（長度 M）→ 前置旋轉 + M/2 點複數 FFT + 後置旋轉
    for (let n = 0; n < H; n++) {
      const xr = u[2 * n], xi = u[M - 1 - 2 * n];
      const j = rev[n];
      re[j] = xr * twRe[n] - xi * twIm[n];
      im[j] = xr * twIm[n] + xi * twRe[n];
    }
    for (let size = 2; size <= H; size <<= 1) {
      const half = size >> 1, step = H / size;
      for (let start = 0; start < H; start += size) {
        for (let k = 0; k < half; k++) {
          const wr = fftRe[k * step], wi = fftIm[k * step];
          const a = start + k, b = a + half;
          const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
    for (let k = 0; k < H; k++) {
      const yr = re[k] * postRe[k] - im[k] * postIm[k];
      const yi = re[k] * postIm[k] + im[k] * postRe[k];
      // ×2：配合 AAC 解碼端 IMDCT 的 2/N 正規化，讓解碼音量與原始一致
      output[2 * k] = 2 * yr;
      output[M - 1 - 2 * k] = -2 * yi;
    }
  };
}

// ---------------------------------------------------------------------------
// 頻譜 Huffman 編碼（codebook 1~11）
// ---------------------------------------------------------------------------
// 每個 codebook：[維度, 是否有號, 最大絕對值(LAV), 索引底數]
const AAC_CB_INFO = [null,
  [4, true, 1, 3], [4, true, 1, 3], [4, false, 2, 3], [4, false, 2, 3],
  [2, true, 4, 9], [2, true, 4, 9], [2, false, 7, 8], [2, false, 7, 8],
  [2, false, 12, 13], [2, false, 12, 13], [2, false, 16, 17]];

function aacEscBits(a) {
  return a < 16 ? 0 : 2 * (31 - Math.clz32(a)) - 3;
}

function aacCbIndex(cb, q, i) {
  const info = AAC_CB_INFO[cb];
  const lav = info[2], mod = info[3];
  if (info[0] === 4) {
    if (info[1]) return (q[i] + lav) * 27 + (q[i + 1] + lav) * 9 + (q[i + 2] + lav) * 3 + (q[i + 3] + lav);
    return (q[i] < 0 ? -q[i] : q[i]) * 27 + (q[i + 1] < 0 ? -q[i + 1] : q[i + 1]) * 9
      + (q[i + 2] < 0 ? -q[i + 2] : q[i + 2]) * 3 + (q[i + 3] < 0 ? -q[i + 3] : q[i + 3]);
  }
  if (info[1]) return (q[i] + lav) * mod + (q[i + 1] + lav);
  let y = q[i] < 0 ? -q[i] : q[i], z = q[i + 1] < 0 ? -q[i + 1] : q[i + 1];
  if (y > 16) y = 16;
  if (z > 16) z = 16;
  return y * mod + z;
}

// 計算某個頻帶用某個 codebook 需要幾個位元
function aacBandBits(cb, q, start, end, T) {
  const info = AAC_CB_INFO[cb];
  const dim = info[0], signed = info[1];
  const bits = T.bits[cb - 1];
  let total = 0;
  for (let i = start; i < end; i += dim) {
    total += bits[aacCbIndex(cb, q, i)];
    if (signed) continue;
    for (let d = 0; d < dim; d++) {
      const v = q[i + d];
      if (v !== 0) total += cb === 11 ? 1 + aacEscBits(v < 0 ? -v : v) : 1;
    }
  }
  return total;
}

function aacWriteBand(w, cb, q, start, end, T) {
  const dim = AAC_CB_INFO[cb][0], signed = AAC_CB_INFO[cb][1];
  const codes = T.codes[cb - 1], bits = T.bits[cb - 1];
  for (let i = start; i < end; i += dim) {
    const idx = aacCbIndex(cb, q, i);
    w.write(codes[idx], bits[idx]);
    if (signed) continue;
    for (let d = 0; d < dim; d++) if (q[i + d]) w.write(q[i + d] < 0 ? 1 : 0, 1);
    if (cb === 11) {
      for (let d = 0; d < dim; d++) {
        const a = Math.abs(q[i + d]);
        if (a < 16) continue;
        const L = 31 - Math.clz32(a);
        w.write((1 << (L - 4)) - 1, L - 4); // escape prefix（L-4 個 1）
        w.write(0, 1);                       // separator
        w.write(a - (1 << L), L);            // escape word
      }
    }
  }
}

// 幫每個頻帶挑最省位元的 codebook
function aacChooseCodebooks(q, swb, numBands, T, cbs, bandBits) {
  let maxSfb = 0;
  for (let b = 0; b < numBands; b++) {
    let maxAbs = 0;
    for (let i = swb[b]; i < swb[b + 1]; i++) {
      const a = q[i] < 0 ? -q[i] : q[i];
      if (a > maxAbs) maxAbs = a;
    }
    if (maxAbs === 0) { cbs[b] = 0; bandBits[b] = 0; continue; }
    maxSfb = b + 1;
    const first = maxAbs <= 1 ? 1 : maxAbs <= 2 ? 3 : maxAbs <= 4 ? 5 : maxAbs <= 7 ? 7 : maxAbs <= 12 ? 9 : 11;
    let best = first, bestBits = aacBandBits(first, q, swb[b], swb[b + 1], T);
    if (first !== 11) {
      const alt = aacBandBits(first + 1, q, swb[b], swb[b + 1], T);
      if (alt < bestBits) { best = first + 1; bestBits = alt; }
    }
    cbs[b] = best; bandBits[b] = bestBits;
  }
  return maxSfb;
}

// 將相鄰同 codebook 的頻帶合併成 section
function aacSections(cbs, maxSfb) {
  const sections = [];
  for (let b = 0; b < maxSfb;) {
    let e = b + 1;
    while (e < maxSfb && cbs[e] === cbs[b]) e++;
    sections.push([cbs[b], e - b]);
    b = e;
  }
  return sections;
}

function aacSectionBits(sections) {
  let total = 0;
  for (const [, len] of sections) total += 4 + 5 * (Math.floor(len / 31) + 1);
  return total;
}

// 固定開銷：SCE 標頭(7) + global_gain(8) + ics_info(1+2+1+6+1) + pulse/tns/gain(3) + END(3)
const AAC_FIXED_BITS = 7 + 8 + 11 + 3 + 3;

// ---------------------------------------------------------------------------
// 主函式：16-bit 單聲道 PCM → AAC-LC M4A
// ---------------------------------------------------------------------------
/**
 * @param {Uint8Array} pcmBytes   16-bit little-endian 單聲道 PCM
 * @param {number} sampleRate     例如 24000
 * @param {{bitrate?: number}} [options]  目標平均位元率（bps），預設 48000
 * @returns {{ bytes: Uint8Array, durationMs: number, frames: number }}
 */
function encodePcmToM4a(pcmBytes, sampleRate, options = {}) {
  const sfIndex = AAC_SAMPLE_RATES.indexOf(sampleRate);
  if (sfIndex < 0) throw new Error(`AAC 不支援這個取樣率：${sampleRate}`);
  const T = getAacTables();
  const swb = AAC_SWB_1024[AAC_SWB_KEY[sampleRate]];
  const numBands = swb.length - 1;
  const bitrate = Math.min(options.bitrate || 48000, Math.floor((AAC_MAX_FRAME_BITS * sampleRate) / AAC_FRAME));

  const numSamples = Math.floor(pcmBytes.byteLength / 2);
  if (numSamples === 0) throw new Error('PCM 資料是空的，無法編碼');
  const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, numSamples * 2);
  // 前面墊 1024 個 0（AAC encoder delay），後面補 0 到 frame 邊界
  const numFrames = Math.ceil(numSamples / AAC_FRAME) + 1;
  const padded = new Float64Array((numFrames + 1) * AAC_FRAME);
  for (let i = 0; i < numSamples; i++) padded[AAC_FRAME + i] = view.getInt16(i * 2, true);

  const mdct = createMdct();
  const spec = new Float64Array(AAC_FRAME);
  const mag = new Float64Array(AAC_FRAME); // |X|^0.75，量化時只需乘上倍率
  const q = new Int32Array(AAC_FRAME);
  const cbs = new Uint8Array(numBands), bandBits = new Uint32Array(numBands);

  const targetBits = Math.floor((bitrate * AAC_FRAME) / sampleRate);
  const maxReservoir = AAC_MAX_FRAME_BITS - targetBits;
  let reservoir = 0, prevGain = 128;
  const frames = [];
  let totalBytes = 0;

  const quantize = (g) => {
    const s = Math.pow(2, -0.1875 * (g - 100)); // (2^(-(g-100)/4))^0.75
    let overflow = false;
    for (let k = 0; k < AAC_FRAME; k++) {
      let v = Math.floor(mag[k] * s + 0.4054);
      if (v > 8191) { v = 8191; overflow = true; }
      q[k] = spec[k] < 0 ? -v : v;
    }
    return overflow;
  };
  const frameBits = () => {
    const maxSfb = aacChooseCodebooks(q, swb, numBands, T, cbs, bandBits);
    const sections = aacSections(cbs, maxSfb);
    let bits = AAC_FIXED_BITS + aacSectionBits(sections);
    for (let b = 0; b < maxSfb; b++) if (cbs[b]) bits += 1 + bandBits[b]; // 1 = 差值 0 的 scalefactor 碼
    return { bits, maxSfb, sections };
  };

  for (let f = 0; f < numFrames; f++) {
    mdct(padded.subarray(f * AAC_FRAME, f * AAC_FRAME + 2 * AAC_FRAME), spec);
    for (let k = 0; k < AAC_FRAME; k++) mag[k] = Math.pow(Math.abs(spec[k]), 0.75);

    // 二分搜尋：在位元預算內找最小（最精細）的 global gain
    const budget = Math.min(AAC_MAX_FRAME_BITS - 8, targetBits + reservoir);
    // 先在上一個 frame 的 gain 附近找（相鄰 frame 通常很接近），不夠再擴大範圍
    const fits = (g) => !quantize(g) && frameBits().bits <= budget;
    let lo = Math.max(0, prevGain - 8), hi = Math.min(255, prevGain + 8);
    while (lo > 0 && fits(lo)) lo = Math.max(0, lo - 16);
    while (hi < 255 && !fits(hi)) hi = Math.min(255, hi + 16);
    let best = hi;
    while (lo <= hi) {
      const g = (lo + hi) >> 1;
      if (fits(g)) { best = g; hi = g - 1; } else lo = g + 1;
    }
    prevGain = best;
    quantize(best);
    const { maxSfb, sections } = frameBits();

    const w = new AacBitWriter(AAC_MAX_FRAME_BITS / 8 + 8);
    w.write(0, 3);              // ID_SCE
    w.write(0, 4);              // element_instance_tag
    w.write(best, 8);           // global_gain
    w.write(0, 1);              // ics_reserved_bit
    w.write(0, 2);              // ONLY_LONG_SEQUENCE
    w.write(0, 1);              // window_shape = sine
    w.write(maxSfb, 6);
    w.write(0, 1);              // predictor_data_present
    for (const [cb, len] of sections) {
      w.write(cb, 4);
      let l = len;
      while (l >= 31) { w.write(31, 5); l -= 31; }
      w.write(l, 5);
    }
    for (let b = 0; b < maxSfb; b++) if (cbs[b]) w.write(T.sfCodes[60], T.sfBits[60]); // 所有頻帶同一 scalefactor，差值為 0
    w.write(0, 3);              // pulse / tns / gain_control 皆不使用
    for (let b = 0; b < maxSfb; b++) if (cbs[b]) aacWriteBand(w, cbs[b], q, swb[b], swb[b + 1], T);
    w.write(7, 3);              // ID_END
    const bytes = w.bytes();
    frames.push(bytes);
    totalBytes += bytes.length;
    reservoir = Math.max(0, Math.min(maxReservoir, reservoir + targetBits - bytes.length * 8));
  }

  const bytes = buildM4aContainer(frames, totalBytes, {
    sampleRate, sfIndex, numSamples, avgBitrate: Math.round((totalBytes * 8 * sampleRate) / (numFrames * AAC_FRAME)),
    maxFrameBytes: frames.reduce((m, fr) => Math.max(m, fr.length), 0),
  });
  return { bytes, durationMs: Math.round((numSamples / sampleRate) * 1000), frames: numFrames };
}

/**
 * 取代舊的 wrapPcmAsWav()：參數相同，回傳 M4A 檔案的位元組。
 * @param {Uint8Array} pcmBytes
 * @param {number} sampleRate
 * @returns {Uint8Array}
 */
function wrapPcmAsM4a(pcmBytes, sampleRate) {
  return encodePcmToM4a(pcmBytes, sampleRate).bytes;
}

// ---------------------------------------------------------------------------
// MP4 / M4A 容器封裝（ISO/IEC 14496-12 / 14496-14）
// ---------------------------------------------------------------------------
function buildM4aContainer(frames, totalBytes, info) {
  const { sampleRate, sfIndex, numSamples, avgBitrate, maxFrameBytes } = info;
  const enc = new TextEncoder();
  const u32 = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  const u16 = (v) => [(v >>> 8) & 255, v & 255];
  const zeros = (n) => new Array(n).fill(0);
  const box = (type, ...parts) => {
    const body = parts.flat(Infinity);
    return [...u32(body.length + 8), ...enc.encode(type), ...body];
  };
  const fullBox = (type, version, flags, ...parts) => box(type, version, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255, ...parts);
  const desc = (tag, ...parts) => { const body = parts.flat(Infinity); return [tag, body.length, ...body]; };
  const matrix = [...u32(0x10000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x10000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x40000000)];

  const numFrames = frames.length;
  const mediaDuration = numFrames * AAC_FRAME;
  const asc = [(2 << 3) | (sfIndex >> 1), ((sfIndex & 1) << 7) | (1 << 3)]; // AAC-LC, 單聲道
  const esds = fullBox('esds', 0, 0,
    desc(3, u16(1), 0,
      desc(4, 0x40, 0x15, 0, ...u16(Math.max(maxFrameBytes, 1)), u32(Math.max(avgBitrate, Math.ceil((maxFrameBytes * 8 * sampleRate) / AAC_FRAME))), u32(avgBitrate),
        desc(5, asc)),
      desc(6, 2)));
  const mp4a = box('mp4a', zeros(6), u16(1), zeros(8), u16(1), u16(16), zeros(4), u32(sampleRate * 65536 >>> 0), esds);

  const sizes = frames.map((fr) => u32(fr.length));
  const buildMoov = (chunkOffset) => box('moov',
    fullBox('mvhd', 0, 0, u32(0), u32(0), u32(sampleRate), u32(numSamples), u32(0x10000), u16(0x100), zeros(10), matrix, zeros(24), u32(2)),
    box('trak',
      fullBox('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(numSamples), zeros(8), u16(0), u16(0), u16(0x100), u16(0), matrix, u32(0), u32(0)),
      // edit list：跳過 1024 個 priming 樣本，讓播放長度剛好等於原始 PCM
      box('edts', fullBox('elst', 0, 0, u32(1), u32(numSamples), u32(AAC_FRAME), u16(1), u16(0))),
      box('mdia',
        fullBox('mdhd', 0, 0, u32(0), u32(0), u32(sampleRate), u32(mediaDuration), u16(0x55c4), u16(0)),
        fullBox('hdlr', 0, 0, u32(0), [...enc.encode('soun')], zeros(12), [...enc.encode('SoundHandler')], 0),
        box('minf',
          fullBox('smhd', 0, 0, u16(0), u16(0)),
          box('dinf', fullBox('dref', 0, 0, u32(1), fullBox('url ', 0, 1))),
          box('stbl',
            fullBox('stsd', 0, 0, u32(1), mp4a),
            fullBox('stts', 0, 0, u32(1), u32(numFrames), u32(AAC_FRAME)),
            fullBox('stsc', 0, 0, u32(1), u32(1), u32(numFrames), u32(1)),
            fullBox('stsz', 0, 0, u32(0), u32(numFrames), sizes),
            fullBox('stco', 0, 0, u32(1), u32(chunkOffset)))))));

  const ftyp = box('ftyp', [...enc.encode('M4A ')], u32(0), [...enc.encode('M4A isommp42')]);
  const moovSize = buildMoov(0).length;
  const moov = buildMoov(ftyp.length + moovSize + 8); // moov 放在 mdat 前面（fast start）

  const out = new Uint8Array(ftyp.length + moov.length + 8 + totalBytes);
  out.set(ftyp, 0);
  out.set(moov, ftyp.length);
  let p = ftyp.length + moov.length;
  out.set(u32(totalBytes + 8), p);
  out.set(enc.encode('mdat'), p + 4);
  p += 8;
  for (const fr of frames) { out.set(fr, p); p += fr.length; }
  return out;
}
