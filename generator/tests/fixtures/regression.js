/**
 * Regression hashes of generated puzzles: for each (variant, level) combination the hash
 * of the puzzle that the pipeline gives for each of the 20 fixed seeds (see perf-helper.js).
 * GENERATED FILE - never edit by hand. Record the hashes of the current code on purpose
 * with
 *   node tests/perf.js --update-hashes
 * or SG_UPDATE_HASHES=1 node tests/node-runner.js --suite=perf
 * after a change that is meant to alter puzzles (a calibration, a new dig rule). A change
 * that must not alter them (an optimisation) leaves this file as it is: the suite "perf"
 * fails when a puzzle of a recorded (configuration, seed) pair differs.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  SG.fixtures.regression = {
    version: 1,
    seeds: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946],
    hashes: {
      'classic4/veryEasy': [
        'cfdf9052c826174e', '9c3830fae77b7fd6', '2d49259e3a97eb32', '546c1e997d9013fd',
        '728d910ad8a2c5c6', 'c8618eed83a0a299', '45e2eaf28bf1baae', 'e6b3415263cbafae',
        '334950b2bffd26ee', '87a5148ab00695e6', '27a541caf42a4846', '541f4a3aeaca8fb6',
        '0886c31a7d5c32d6', '3d654fba7c09d156', '810fb11be09d9ea7', 'b20f46f891a4305c',
        '903e95a48a750150', '482d8a5604ac756a', 'baa0db32101bb14e', 'e7b213f6e0eb4f0a'
      ],
      'classic6/veryEasy': [
        '2b6c9237e264b873', '6cc0e600ecf21184', 'd13f73833c4da377', 'cc057218e9ffb4dc',
        '9f5cb7793a7ff7a5', '789beba1f0dfde4d', 'e158c5100f8688d4', 'db1f065336f228c7',
        '3faec6a84cc6fd2c', '59ac945d0fff1ea1', 'e246c10eabe168c2', 'eab9642a661ecf06',
        '7c7655a4f6f334f0', '97e5b11758f02eb3', 'ea56fe0e290cc0a2', '6839c951ed87ee3d',
        'c9b16100419f04a4', 'b6d3f29fc6bb16fb', '7c640031339f6fbd', '5184466bdf0eb93f'
      ],
      'classic6/hard': [
        '574474311da5e1bd', 'ebf80364c8038d30', 'deebe99ca53c1b08', '16699f94c0182fc0',
        'f04dcdb2a7033d2e', '0417bf9be8da844f', '3934a44d0a2ebb31', '06fc4cfa991c1e56',
        '41782667eea6f043', '704b503d56ad1e41', 'b8f358daf51c2836', '33ef8b3c6916a3a8',
        'cc36183ecfa63652', 'b80a9a434f75e457', '1f3b5c169454b6ca', '86176e23cf286857',
        '15e21332252d6f6e', '0be944fd5d3fe141', 'd7355e2086317a44', '75d11c203891e284'
      ],
      'classic9/veryEasy': [
        'b69ed95547eb4f09', '5fff9ba28713275e', '8c0e84aa5609f656', '54f5331c2b6491e0',
        'f48626d223c29afe', '0f9ba7a745f98063', 'd5e9b1f92f079e25', 'b09bcc6d7460b631',
        '2649061483eced78', '72865cb6c633457a', 'cceff5adb44f0021', 'c6aa405ccfee8280',
        'cbe34a75d8407079', '79aea134907ba578', '26d4792cee9c4670', 'cad2d96526214659',
        'd763b71e39a8e842', '34def9b0aad43b7c', '84a0fb3b1f761def', '0ddd320e8abd7072'
      ],
      'classic9/easy': [
        'f13dafc7eb9b47c3', 'c48cdb30a2a694ac', 'c1f0fd63fe3f73c7', '136b2771dae2a11d',
        '2f596729e6d3a325', 'fc0995d0d9374fec', 'bbacee62d5a81fce', 'bf89a2b6caf77e1a',
        '5fdcad385fc3ac04', 'a8ed11845212cc68', 'c8e2457ecd3602a2', 'c5a71fae38bc99d2',
        'b7802c520e72e3fe', 'c439920c7e01d2d0', '3865e7e9a3e498d5', '2c65f22aeb883086',
        '89b52757515f80a3', 'cdafa4e21cb63f1e', 'a6084cccb0ead5d0', '38c28c06ab4590ea'
      ],
      'classic9/normal': [
        '0ca00ae15e5cff0d', 'a5b5ead42f11d018', 'eeef3f6077a69a4c', 'ab91cd66e61f4b4a',
        '659c7c6834891854', '02274b8f8570a9db', 'ef28fdca396a4496', 'fec22b176a036943',
        '344f5121108da81d', '309497927fc3396e', 'fc2a91bd85977a61', '8025ff5faadb992b',
        '2179010bc7bb4d1f', 'e3d6a5dd7b803ac1', '2eece18b3a87671f', '62032a6281b0860e',
        '2c954e8784927b33', 'e1f6061474401c98', '1f9b7aa5ee1db7b9', 'a451447f751e433b'
      ],
      'classic9/hard': [
        '40fdd3618f9fe1cd', '5211afb6f6e0578a', '7a9837af6ccfc94b', 'dce72ce6a0b55cea',
        '21ba4978178fe9c4', '919703384cdfbde4', '26eafd827e56e3fe', '096ffc3e88311212',
        'aed146eb93c91bcf', 'b0bfcec37b2e2097', 'fb1e5811a4a5944d', '7756b11cb6f69b30',
        'f04b340171d2e9cd', '8c6c3e4a8a1dd866', '8685946bc9f9a7cf', '3004c2f206b511ce',
        'e12c4467721b7213', 'd68d25a60ffe38ea', '25e8f2abf906d05f', 'b277386afa20f9b6'
      ],
      'classic9/expert': [
        'cf5f01b2e3df218e', '63335b832060f687', 'd4c73053838ab967', 'aa605316ef7fdcda',
        'dfc2f27edb889022', '98678781ced00fad', 'a4d6d901961fa4ed', '7cfeb5c04370f9ec',
        '3f51f20c1eff1a10', '2b24125181b5be0d', '8d70a6b459b91bc8', '063cef13bd709f07',
        'e6b3e77ad6e0d956', '1ce384f24682d10e', '63fa5afc801f28f0', '608b89563e6deaea',
        '9b72e4ea0444d336', '99364360081d05bc', 'd230944fcb0b146b', 'd524902c9924d020'
      ],
      'classic9/master': [
        'c883035c9414b9f0', '1e7617daded7a8a6', 'e5e8fccf8342a1db', '0c4bb3da4f926356',
        '0114fb0cf1cede10', '13b7c1c9afb3c8a5', '0a74807f75b8a62b', 'c4261f0e59b00482',
        'e2b21c3a51c55c76', '5a5b1a4d758bde81', 'de82e9161d25bdda', '790437da17a235f6',
        '11ee29190ad828f5', '92703c2274ea2a3e', 'a1e70ea13ee80f3d', 'e2b78540b64df61c',
        '40fb1b94a17744c8', 'd48f0936b7e71cda', '29347bf7614c9de3', '0653c5d7dc8f5133'
      ],
      'classic9/nightmare': [
        '86d1e172be618b9e', '7c81935f28cc9f0b', '03c94c54f91828d8', '486e7c2ec5568382',
        '345c0e526057fe6e', '12ef6c318fc0d53d', 'b1f7b262d7cb10ce', 'e6a777410136194d',
        '4164e7fe5f7fe0e2', 'a8f60dd9c9e86735', '0caa79518030700d', '5b51d9e075f3fe7c',
        'b457b0449e9a0ee8', '71afbd6714c77a53', 'd21fee25b9491269', '007dfd6ad95d9536',
        'e357e244ced63998', '333527f37c599ca7', '9f3bae9bcddae99f', 'e5675280f034fbac'
      ],
      'mega12/normal': [
        '2ecca66d8bb65c01', '880378cbd0717e4f', '8db24fe4df2928a0', '0b285e5e4c290fba',
        '4877d77867cbd61c', '43ed6690ac7c348c', '5d19fd7e33a754d2', 'bf726af92696d3ed',
        'baa35f2a59d071f6', '62ef71cdb564be61', 'ecd8bfc5dcb94cf9', '28adbaa28171fd1e',
        '646f5e28be7acadc', '37c7d0c09e7f752c', '460aa705440e6769', '289dd101d95a4e45',
        'b690724544e18d81', 'e6bcb4575bc90c83', 'bd76e3a260d5123e', '02d858c78647c28b'
      ],
      'mega16/easy': [
        'bff22de04d4777ec', 'dcfc1daa8f223f96', 'c9ca37ee0aaea1fa', '8df84658edbf6d6c',
        'ebdf4d34eb202b28', 'f777c5251cc36899', '1825941a70d2c3ae', '4ddc7b6e1fab3392',
        'd82ae1d63d2ea79a', '20da2293501deb07', '449cd214bfccb778', 'a2011a797857eadd',
        '036411f522dc5089', '8d61b25e0438a6da', '6d00003c7625da48', '27b951cc96a54830',
        '27ca9ff737bbb6db', '36a08aabc4a1278f', '9d5ba3be31fbd642', '7e492356c226b632'
      ],
      'diagonalX/easy': [
        '9c8e49f05ea7285c', 'b3d6628e39c5c302', '825ad7840cbd1898', 'ed2fd97eda3a5b52',
        'ca3467193eb70335', '4fc5878d57bebaf1', '5062e511d91b361d', 'b8fa35efceb9ed4b',
        '3369c38bed0e84ef', 'afa27c106add2eac', 'a4a739ace99ed790', '5864997927d7ac75',
        '07436df731180c13', 'aa8a36772c2db7d3', '3cb099b3595569d7', '18c13b85be101b29',
        '69ce6a82fd52539e', 'e9142c88dff360d4', 'd5f4aeb7c4373de3', 'e3bb09c54249a2c9'
      ],
      'diagonalX/nightmare': [
        '2d590e59df31f175', 'e146de8f5fc95aeb', 'edfaf735dcebeb69', '5b8f8f4f3a25a82b',
        '30a81f93a7eab1f7', '863dc6f9375bbf65', 'fc8b5eca9ce169f6', 'd3b88366b7c46bea',
        'ede7d7d846a4fb74', '78167d96fc3b356a', '37f4fcd45964d318', '0086fe024b32105e',
        '9107519cffd51390', '51d9d3e0d8c2b83c', '11904526120cfa2a', 'd74675d99db28fa5',
        '9aa483a3ce170ef7', '009356628779619e', '0b042686411f1b3a', '4d80a44cf03bb140'
      ],
      'hyper/hard': [
        '7be06221d5c2e4bd', 'bc3d5e35d5c2eaf9', 'b2f1ed93f656de47', 'f4457e2498810bd8',
        '38bb427a649bcf36', '731324bc439c8ec0', 'ad0e45226c19df8e', '37dde883ba486aa7',
        '80b5ed097bc24345', '4c0e5a9a9d05a2d6', 'f74c25726f17805e', '5c4451eab2778e46',
        '21528e4cf2bfde80', '01166d2b0fe03daf', '2c09a432d0ecf77e', 'a866ecbffbfee9cb',
        '058337e6a87c18ea', '7a89449a7dd91316', '9c6e3e5385b7e8c7', '5a740a58f4fea224'
      ],
      'jigsaw9/normal': [
        '2c4d9f7b5163597f', '6735049e02d6c682', '6e3f276349ae5557', '5fdb990b0a55114f',
        'f8c6e9bd6b0c4041', '48fa0230044ff14c', 'c3b52dc57dfc2ca9', '3021756515303589',
        'dedd3fd8c92334f4', 'de8e0f60d17b0e0c', '6101aba1cdef118d', '7238027967442e45',
        'a503ec29aed16c35', '55bbc11b89197faf', 'ac82ffd4783b28e8', '9f7fc1c2cd0fba9e',
        'ae439792713099ee', 'f9c28b39778a6835', '778deec3bee245d7', 'a8e3e89559134559'
      ],
      'jigsaw9/master': [
        '00a9e7462afbf6ba', '287cd2ac64315cf0', '66e69cace3758150', 'e059108b7a7ccdcf',
        '2aded89003eb0a0c', '3fe30814fd656638', 'ed0e2785ae41c129', 'fa41c1b1966b659d',
        'e4b8d4cac3956116', 'b2de10f01448f3cc', 'efa269229ffe7f8e', '1f33856b569e669f',
        'bd965481775cd63d', '8e97f96151f899ed', '1c320217532fb6a3', '69d939da07d1b9f6',
        'a81a3bd08ade790c', 'f85026d6fd76e96a', '366eda4729af6993', '5a9fe1f53f18b719'
      ],
      'killer/easy': [
        'e2aa3bbe9014f762', '5d6a301b871aed0f', 'fd58fb9220b3fe36', '12136217e152a1c3',
        '283309b858dffe8c', 'ffb3b28f1d93696b', 'd27180698b69529d', '68f779bbcaf4402f',
        '97d3eec05a895da4', '9e9192547b6657b0', 'c3f688c7ec48b203', '17593cca9ea75ace',
        '6fff0e587b50e82c', 'eedbb386f2816002', 'c865478d26ce52e9', '9dd6e54afe3b90ce',
        '880e715401c53dc0', 'f4f52246b18b6faa', '3cf6be83fa01d427', '160f6c20731add2c'
      ],
      'killer/hard': [
        '3ebeef31b34a35cd', '6ba5d6665fa90f42', 'c48225dfed2eccdb', 'f29839e4029eb9c8',
        '45e0878d343f0811', '25197193440b59df', '910dd7a96f77fe35', '79aeeefba7f3d077',
        '21431cabef0f6d27', '6acbbdd97936928d', '3f4c9bcd90045409', '8125d02969965045',
        '4f362eebaba1dc77', '9fab0bacd7a2fee8', 'f2c0b285751c3541', 'e4a84af6314fd34a',
        'bfefdca26b175dd6', '30fde1e1bc69becd', '744737bca394c788', '47d25178effcb3a4'
      ],
      'greaterThan/normal': [
        '451f70324dc8cfde', '6178ebe3355d8de7', 'fdf616f1a201e4c5', 'bb4f2fb157042f5d',
        'd868bdfcb80befd0', 'e630c501243b17fd', 'e78928dd159a09b9', '1da2078420403d18',
        'acd99944b1398b68', '9d2dfcc72897d34b', 'abdc4f8d5d4d49b1', '505b2a4e5b1e9a72',
        'cf2cd98ae04a6066', '28c2ea302da80774', '474ecaf811fb58e4', '3687cb45ac207381',
        '30ebd95ebcc28622', '6b17f75973826cf5', '5dddb768e0d111d4', 'f4ec96f5f0d71eb1'
      ],
      'greaterThan/hard': [
        '57723d97f39afc43', 'bd35f3a2985656c6', 'ee05692893689fb4', 'a2d0a30eed29bfaa',
        'fbca2786f61942ea', '4d142fcd38954011', '63aae3bbde5b31b7', 'f69446227ecf603e',
        '3268fd0e36b4a7e2', '7ff7ff078c0d13e3', '5a5d8c2137663775', 'bb422294eda15ca0',
        'f037c7857c5ed171', '2ca82883e5269f57', '48e83fe1be265cbd', '2028c0b8a8b8465c',
        '0b2801e974fd1ecd', '95d2e231ac881b7d', '6cb0d2587d741b64', 'ce03c09a3f922a86'
      ],
      'samurai/easy': [
        '3ea367b0be1bbfa4', 'f0254bc2b6498f5e', 'da494bed4515f211', 'd048eebbad630007',
        '7d34145019b7ac24', '1c56198290a5dc1e', '31f9218272d1ba4e', '4c04fa38a91e4b6c',
        '81e27dabfb6a1ef7', '2455925237c5b22e', 'da98d6c1e1b3c68d', '8ab9e40e78d74d72',
        'f78a53f3504f318f', '81bfcc4cbcf30118', '36644920ccde7f24', '926ded9dead3ca31',
        '957046eee4d64972', '3dbccc48460dd0ec', '320eaefbd19c5817', '7fd7aaedd17768d1'
      ],
      'sohei/veryEasy': [
        'a0b73b38900c816c', '1f9632340b3289b0', '2d1421dfc3fd477b', 'b232e83338e13cc7',
        '6bb27729406ed46d', 'ef0dd7cdf30c2179', '02ef82980a0d56fc', '95cdfe67491a0fd3',
        '85e79e4572f1a3f1', 'f7b23bd86c4e0a8c', '19434e6df9b68c69', 'c62bda95e241daf1',
        '07550a1e621f5682', 'df82d5a102579495', '8f489f862f61874a', '3b1caccba1d276df',
        'b83d163c35a2db28', '60f3a0f33b123ad7', '4dbb4d036c950357', 'c3ef4a82a5063d7e'
      ],
      'butterfly/normal': [
        '6607059829e6df7c', 'ecc8408ffc38342b', '19fa48c21139b826', '69efd16ff1dd2d8b',
        'b01ee445bb9b59c9', 'b45089011ed8de0d', '3ba9f2026059a496', '9cc84cb3b0d9c977',
        'e02a01fd4779fdf1', 'a91195c46f34c300', 'ecc30f2f5eeaad5b', '6abd8b19b72a3e35',
        '5b5c80220693f996', '4598f71fc60f2bcb', '63ba0bb96373c3e5', '0fa09fc26fea3856',
        '81465f298bc85355', 'a341e7c88c314d3c', '86b1fe9677d0ab12', 'e31222625c794c36'
      ],
      'flower/normal': [
        '29a1ca2796eb3c73', '116f1bf2e7b3ce2e', '621451872de5c3c3', '75c650cbed8d8d8f',
        '29de2a3630265a2a', 'a5c4ed87e8936ed3', 'db8e880904819e25', 'eb6fbf557bafcbc9',
        'fcb6ad2fb40c741b', '655322ea9df41c06', '1852a5b4f107ab90', '50cccfec506e1678',
        '08a95f9347524857', 'e9cfaba77d3d95c3', '039353de203380e2', '30012b41b0b5429d',
        '3820f5bd7b062201', '338b95d9e6741be5', '95d5de7fb560f24b', 'a261a50362027ee7'
      ],
      'wordoku/normal': [
        'eb7023bf2524cdbb', '84c18ad36aa77cf7', '4d8e6ba2e23fb4ae', 'cdb6125093a657cc',
        '3749ae2311557287', 'e5e9ffb1f77da01d', '13c404cb2d2927c7', 'fece246665d97f82',
        'ae8755effe00e4ab', '757938a437db3690', 'c5bc5f5b181d99bf', '796cb18ce3db12e0',
        'e3ceb1478406184b', 'f2d98b4c08c11c48', '2fd9425d002699c1', '27f43e542e1e6e60',
        '9bd86cc4381884b0', '9acdf3ec4b782cb0', '9881e4742566e8b8', 'abfe29d6eddcbe9a'
      ]
    }
  };
})();
