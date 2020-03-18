pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract BlockEHR {
    
    struct user {
        address id;
        string name;
        string pubKey;
        string userType;
    }
    
    struct file {
        address from_id;
        address to_id;
        string name;
        string hash;
        string key;
        string iv;
        bool approved;
        uint timestamp;
    }
    
    uint256 internal totalFiles = 0;
    mapping(uint256 => string) internal allFiles;
    mapping(string => file) internal fileInfo;
    
    uint internal totalUsers = 0;
    mapping(uint256 => address) internal allUsers;
    mapping(address => user) internal users;
    mapping(address => file[]) internal userSentFileList;
    mapping(address => file[]) internal userRcvdFileList;
    
    function registerUser(string memory name, string memory pubKey, string memory userType) public {
        user storage u = users[msg.sender];
        require(keccak256(abi.encodePacked((name))) != keccak256(abi.encodePacked((""))));
        if(msg.sender == u.id) {
            revert("already registered");
        } else {
            users[msg.sender] = user(msg.sender, name, pubKey, userType);
            allUsers[totalUsers] = msg.sender;
            totalUsers++;
        }
    }
    
    function getAllUsers() public view returns(string[] memory names, address[] memory addr, string[] memory types) {
        address[] memory addrList = new address[](totalUsers);
        string[] memory namesList = new string[](totalUsers);
        string[] memory typeList = new string[](totalUsers);
        for (uint i = 0; i < totalUsers; i++) {
            addrList[i] = allUsers[i];
            namesList[i] = users[addrList[i]].name;
            typeList[i] = users[addrList[i]].userType;
        }
        return (namesList, addrList, typeList);
    }
    
    function getUserName() public view returns(string memory name) {
        return users[msg.sender].name;
    }
    
    function getPublicKey(address id) public view returns(string memory pubKey) {
        return users[id].pubKey;
    }
    
    function addFile(address to_id, string memory name, string memory hash, string memory key, string memory iv) public {
        fileInfo[hash] = file(msg.sender, to_id, name, hash, key, iv, true, block.timestamp);
        userSentFileList[msg.sender].push(fileInfo[hash]);
        userRcvdFileList[to_id].push(fileInfo[hash]);
        totalFiles++;
    }
    
    function getAllTransactions(address id) public view returns(file[] memory files) {
        return (userSentFileList[id]);
    }
    
    function getSentFiles() public view returns(file[] memory sentFiles) {
        return (userSentFileList[msg.sender]);
    }
    
    function getReceivedFiles() public view returns(file[] memory rcvdFiles) {
        return (userRcvdFileList[msg.sender]);
    }
    
    function getFile(string memory hash) public view returns(string memory name, string memory key, string memory iv) {
        if(fileInfo[hash].approved == true) {
            if(msg.sender == fileInfo[hash].from_id) {
                return (fileInfo[hash].name, fileInfo[hash].key, fileInfo[hash].iv);
            } else if(msg.sender == fileInfo[hash].to_id) {
                return (fileInfo[hash].name, fileInfo[hash].key, fileInfo[hash].iv);
            }
        }
    }
}