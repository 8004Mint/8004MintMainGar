import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("StoryStaking", function () {
  let staking: any;
  let storyToken: any;
  let owner: any;
  let user1: any;
  let user2: any;

  const LOCK_7_DAYS = 7 * 24 * 60 * 60;
  const LOCK_30_DAYS = 30 * 24 * 60 * 60;
  const LOCK_90_DAYS = 90 * 24 * 60 * 60;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock STORY token
    const MockToken = await ethers.getContractFactory("EssayGatedToken");
    storyToken = await MockToken.deploy("Story", "STORY", owner.address);
    await storyToken.waitForDeployment();

    // Deploy staking contract
    const StoryStaking = await ethers.getContractFactory("StoryStaking");
    staking = await StoryStaking.deploy(await storyToken.getAddress());
    await staking.waitForDeployment();

    // Transfer some tokens to users (using owner's LP reserve)
    const amount = ethers.parseEther("10000");
    await storyToken.transfer(user1.address, amount);
    await storyToken.transfer(user2.address, amount);

    // Approve staking contract
    await storyToken.connect(user1).approve(await staking.getAddress(), ethers.MaxUint256);
    await storyToken.connect(user2).approve(await staking.getAddress(), ethers.MaxUint256);
  });

  describe("Staking", function () {
    it("Should stake tokens with 7-day lock", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(staking.connect(user1).stake(amount, LOCK_7_DAYS))
        .to.emit(staking, "Staked")
        .withArgs(user1.address, 0, amount, LOCK_7_DAYS, 100);

      expect(await staking.userTotalStaked(user1.address)).to.equal(amount);
      expect(await staking.totalStaked()).to.equal(amount);
    });

    it("Should stake with different lock periods", async function () {
      const amount = ethers.parseEther("1000");
      
      // 7 days - 1.0x
      await staking.connect(user1).stake(amount, LOCK_7_DAYS);
      let stake = await staking.stakes(user1.address, 0);
      expect(stake.multiplier).to.equal(100);

      // 30 days - 1.5x
      await staking.connect(user1).stake(amount, LOCK_30_DAYS);
      stake = await staking.stakes(user1.address, 1);
      expect(stake.multiplier).to.equal(150);

      // 90 days - 2.5x
      await staking.connect(user1).stake(amount, LOCK_90_DAYS);
      stake = await staking.stakes(user1.address, 2);
      expect(stake.multiplier).to.equal(250);
    });

    it("Should reject invalid lock period", async function () {
      const amount = ethers.parseEther("1000");
      await expect(staking.connect(user1).stake(amount, 15 * 24 * 60 * 60))
        .to.be.revertedWith("Invalid lock period");
    });

    it("Should reject amount below minimum", async function () {
      const amount = ethers.parseEther("50"); // 50 STORY < 100 minimum
      await expect(staking.connect(user1).stake(amount, LOCK_7_DAYS))
        .to.be.revertedWith("Amount below minimum (100 STORY)");
    });

    it("Should reject amount above maximum", async function () {
      // Give user more tokens for testing
      await storyToken.transfer(user1.address, ethers.parseEther("200000"));
      
      const amount = ethers.parseEther("150000"); // 150,000 STORY > 100,000 maximum
      await expect(staking.connect(user1).stake(amount, LOCK_7_DAYS))
        .to.be.revertedWith("Amount above maximum (100,000 STORY)");
    });
  });

  describe("Points Calculation", function () {
    it("Should accumulate points over time", async function () {
      const amount = ethers.parseEther("1000");
      await staking.connect(user1).stake(amount, LOCK_7_DAYS);

      // Fast forward 1 day
      await time.increase(24 * 60 * 60);

      const pending = await staking.getPendingPoints(user1.address, 0);
      // 1000 tokens * 0.01 * 1.0x * 1 day = 10 points (with 18 decimals)
      expect(pending).to.equal(ethers.parseEther("10"));
    });

    it("Should apply multiplier correctly", async function () {
      const amount = ethers.parseEther("1000");
      
      // Stake with 30-day lock (1.5x)
      await staking.connect(user1).stake(amount, LOCK_30_DAYS);

      // Fast forward 10 days
      await time.increase(10 * 24 * 60 * 60);

      const pending = await staking.getPendingPoints(user1.address, 0);
      // 1000 * 0.01 * 1.5 * 10 = 150 points (with 18 decimals)
      expect(pending).to.equal(ethers.parseEther("150"));
    });
  });

  describe("Unstaking with Penalty", function () {
    it("Should unstake flexible stake anytime without penalty", async function () {
      const amount = ethers.parseEther("1000");
      await staking.connect(user1).stake(amount, LOCK_7_DAYS);

      // Fast forward 1 day
      await time.increase(1 * 24 * 60 * 60);

      // Flexible - no penalty
      const penaltyBefore = await staking.getPenaltyPercent(user1.address, 0);
      expect(penaltyBefore).to.equal(0);

      const balanceBefore = await storyToken.balanceOf(user1.address);
      await staking.connect(user1).unstake(0);
      const balanceAfter = await storyToken.balanceOf(user1.address);

      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    it("Should unstake with penalty when early", async function () {
      const amount = ethers.parseEther("1000");
      await staking.connect(user1).stake(amount, LOCK_90_DAYS);

      // Fast forward 45 days (50% completed)
      await time.increase(45 * 24 * 60 * 60);

      // Penalty about 25% (remaining 50% × 50% max penalty)
      const penalty = await staking.getPenaltyPercent(user1.address, 0);
      expect(penalty).to.be.closeTo(25n, 1n); // Allow 1% margin

      // Points after unlock should be 75%
      await staking.connect(user1).unstake(0);
      const points = await staking.userPoints(user1.address);
      
      // Expected points: 1000 * 0.01 * 2.5 * 45 = 1125
      // After ~25% deduction, get ~844 points
      const expectedFull = ethers.parseEther("1125");
      const expectedAfterPenalty = expectedFull * 75n / 100n;
      expect(points).to.be.closeTo(expectedAfterPenalty, ethers.parseEther("20")); // Allow margin
    });

    it("Should unstake without penalty after lock period", async function () {
      const amount = ethers.parseEther("1000");
      await staking.connect(user1).stake(amount, LOCK_30_DAYS);

      // Fast forward 30 days (expired)
      await time.increase(LOCK_30_DAYS);

      // No penalty
      const penalty = await staking.getPenaltyPercent(user1.address, 0);
      expect(penalty).to.equal(0);

      await staking.connect(user1).unstake(0);
      const points = await staking.userPoints(user1.address);
      
      // Expected points: 1000 * 0.01 * 1.5 * 30 = 450 (no deduction)
      expect(points).to.equal(ethers.parseEther("450"));
    });

    it("Should calculate penalty proportionally", async function () {
      const amount = ethers.parseEther("1000");
      await staking.connect(user1).stake(amount, LOCK_90_DAYS);

      // Withdraw on day 1, penalty about 49%
      await time.increase(1 * 24 * 60 * 60);
      let penalty = await staking.getPenaltyPercent(user1.address, 0);
      expect(penalty).to.be.closeTo(49n, 1n);

      // Withdraw on day 80, penalty about 5%
      await time.increase(79 * 24 * 60 * 60); // Now at day 80
      penalty = await staking.getPenaltyPercent(user1.address, 0);
      expect(penalty).to.be.closeTo(5n, 1n);
    });
  });

  describe("Claim Points", function () {
    it("Should claim points without unstaking", async function () {
      const amount = ethers.parseEther("1000");
      await staking.connect(user1).stake(amount, LOCK_30_DAYS);

      // Fast forward 10 days
      await time.increase(10 * 24 * 60 * 60);

      await staking.connect(user1).claimPoints(0);
      
      const points = await staking.userPoints(user1.address);
      expect(points).to.equal(ethers.parseEther("150")); // 1000 * 0.01 * 1.5 * 10
    });

    it("Should claim all points from multiple stakes", async function () {
      const amount = ethers.parseEther("1000");
      
      await staking.connect(user1).stake(amount, LOCK_7_DAYS);  // 1.0x
      await staking.connect(user1).stake(amount, LOCK_30_DAYS); // 1.5x

      // Fast forward 5 days
      await time.increase(5 * 24 * 60 * 60);

      await staking.connect(user1).claimAllPoints();
      
      const points = await staking.userPoints(user1.address);
      // (1000 * 0.01 * 1.0 * 5) + (1000 * 0.01 * 1.5 * 5) = 50 + 75 = 125
      expect(points).to.equal(ethers.parseEther("125"));
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to spend user points", async function () {
      const amount = ethers.parseEther("1000");
      await staking.connect(user1).stake(amount, LOCK_7_DAYS);

      await time.increase(10 * 24 * 60 * 60);
      await staking.connect(user1).claimPoints(0);

      const pointsBefore = await staking.userPoints(user1.address);
      
      await staking.spendPoints(user1.address, ethers.parseEther("50"), "Whitelist redemption");
      
      const pointsAfter = await staking.userPoints(user1.address);
      expect(pointsBefore - pointsAfter).to.equal(ethers.parseEther("50"));
    });
  });
});
